#!/usr/bin/env node
const exec = require('child_process').exec
const commandExists = require('command-exists').sync //
const fs = require('fs')
const readlineSync = require('readline-sync') //
const path = require('path')
const os = require('os')
const randomize = require('randomatic') //


let id = randomize('Aa0', 5)
let jdkPath
let keytool

run()

async function run() {
	console.log('Looking for the JDK...')
	findJdkPath()
  console.log('Looking for the keytool...')
	findKeyTool()

	await createKeystore((process.argv[2] == 'quick') ? true : false)
}

async function createKeystore (quick) {
	let alias, pass, dname, CN, O, OU, L, ST, C
	let keystore = 'android-'+id+'.keystore'

	if (quick) {
		alias = 'keyalias'
		pass = randomize('Aa0', 16)
		dname = `CN=Unspecified, OU=Unspecified, O=Unspecified, L=Unspecified, ST=Unspecified, C=Unspecified`
	} else {
		console.log('Okay now I need a key alias and key password from you.')

		alias = readlineSync.question('Key alias. Al-num chars, no spaces. Leave default if not sure. (keyalias): ')
		if (!alias) {
			alias = 'keyalias'
		}
	
		pass = readlineSync.question('Store and key pass. Any strong password, it will be saved in a file for you (Enter to generate): ')
		if (!pass) {
			pass = randomize('Aa0', 16)
		}
	
		console.log('Okay, now the drill, input any values you like, these values are not shown anywhere...')
	
		CN = readlineSync.question('CN: Your first and last name (unknown): ')
		if (!CN) {
			CN = 'unknown'
		}
	
		O = readlineSync.question('O: Name of your organization (unknown): ')
		if (!O) {
			O = 'unknown'
		}
	
		OU = readlineSync.question('OU: Name of your organizational unit (unknown): ')
		if (!OU) {
			OU = 'unknown'
		}
	
		L = readlineSync.question('L: Name of your city or locality (unknown): ')
		if (!L) {
			L = 'unknown'
		}
	
		ST = readlineSync.question('ST: Name of your state or province (unknown): ')
		if (!ST) {
			ST = 'unknown'
		}
	
		C = readlineSync.question('C: Two-letter country code (unknown): ')
		if (!C) {
			C = 'unknown'
		}
	
		dname = `CN=${CN}, OU=${OU}, O=${O}, L=${L}, ST=${ST}, C=${C}`
	}



  console.log('Watch me create this '+keystore+' file for you...')
	
  let cmd = exec('"' + keytool + '" -genkey -v -keystore '+keystore+' -alias "' + alias + '" -keyalg RSA -keysize 2048 -validity 10000000 -deststoretype pkcs12 -storepass "' + pass + '" -keypass "' + pass + '" -dname "' + dname + '"')
	cmd.stderr.pipe(process.stderr)
	cmd.stdout.pipe(process.stdout)

  cmd.on('close', (code) => {
    if (code > 0) {
			console.error('Keytool died. :\'(')
			process.exit(1)
    }

    if (fs.existsSync(keystore)) {
				saveInfo({
					keystore: keystore,
         	storepass: pass,
        	keypass: pass,
					key: alias
				})

        console.log("Wonderful. From now on just make sure android-signing-info-"+id+".txt and "+keystore+" are on a safe place. You will need it.")
    } else {
        console.error("Not sure what the hell is going on here. The keytool didn't fail but the "+keystore+" file is missing.")
    }
	})
}

function findJdkPath () {
	console.log('Can\'t get the JAVA_HOME environment variable, you better create one and re-run this, because you should really have this variable available for other purposes.')
	console.log('Wait, let me try the default path...')

	let defaultJdkPath
	switch (os.platform())
	{
		case 'win32':
			defaultJdkPath = path.normalize('C:/Program Files/Java/')
			if (fs.existsSync(defaultJdkPath)) {
				let jdks = fs.readdirSync(defaultJdkPath)
				defaultJdkPath = path.normalize(defaultJdkPath + '/' + jdks[0])
			} else {
				defaultJdkPath = '...' // non-existent path, so it doesn't pass the next check
			}
		break
		case 'darwin': defaultJdkPath = path.normalize('/System/Library/Frameworks/JavaVM.framework/Version/Current'); break
		default:
			defaultJdkPath = path.normalize('/usr/jdk')
			if (fs.existsSync(defaultJdkPath)) {
				let jdks = fs.readdirSync(defaultJdkPath)
				defaultJdkPath = path.normalize(defaultJdkPath + '/' + jdks[0])
			} else { // alternatively OpenJDK
				defaultJdkPath = path.normalize('/usr/lib/jvm/open-jdk')
				if (fs.existsSync(defaultJdkPath)) {
					let jdks = fs.readdirSync(defaultJdkPath)
					defaultJdkPath = path.normalize(defaultJdkPath + '/' + jdks[0])
				} else {
					defaultJdkPath = '...' // non-existent path, so it doesn't pass the next check
				}
			}
	}

	if (fs.existsSync(defaultJdkPath)) {
		jdkPath = defaultJdkPath
		console.log('Found something at ' + defaultJdkPath)
	} else {
		console.log('Nada at ' + defaultJdkPath + '.Have you installed JDK?')
		console.log('Alternatively, you can paste your JDK root path here.')
		
		jdkPath = path.normalize(readlineSync.question('JDK path: '))

		if (!fs.existsSync(jdkPath)) {
			console.error('Nope, you better sort yourself and your JDK first.')
			process.exit(1)
		}
	}
}

function saveInfo(info) {
	info = "Keystore: "+info.keystore+"\nKeystore password: "+info.storepass+"\nKey alias: "+info.key+"\nKey password: "+info.keypass
	console.log('\n====================')
	console.log('KEYSTORE CREATED')
	console.log(info)
	console.log('====================\n')
	fs.writeFileSync('android-signing-info-'+id+'.txt', info)
}

function findKeyTool() {
  if (commandExists('keytool')) {
    keytool = 'keytool'
  } else {
    if (fs.existsSync(path.normalize(jdkPath + '/Commands/keytool'))) {
      keytool = path.normalize(jdkPath + '/Commands/keytool')
    } else if (fs.existsSync(path.normalize(jdkPath + '/bin/keytool'))) {
      keytool = path.normalize(jdkPath + '/bin/keytool')
    } else if (fs.existsSync(path.normalize(jdkPath + '/bin/keytool.exe'))) {
      keytool = path.normalize(jdkPath + '/bin/keytool.exe')
    } else {
      console.error('The keytool tool is not there (' + path.normalize(jdkPath + '/<bin|Commands>/keytool[.exe]') + '). What sort of things have you done to your JDK? You better reinstall it.')
			process.exit(1)
		}
	}
	
  console.log('Here it is.')
}