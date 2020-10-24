const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')
import setupDb from './setup/db.setup';
import { bootstrap } from './setup/bootstrapCredential'
export default async function setCmdArgs() {
    const optionDefinitions = [
        {
            name: 'help',
            alias: 'h',
            type: Boolean,
            description: 'Display this usage guide.'
        },
        {
            name: 'version',
            alias: 'v',
            type: Boolean,
            description: 'Displays current version'
        },
        {
            name: 'newdb',
            alias: 'n',
            type: Boolean,
            description: 'Setup the database.'
        },
        {
            name: 'bootstrap',
            alias: 'b',
            type: Boolean,
            description: 'Register a did and HypersignAuthCredentail on the network.'
        }
    ]
    const options = commandLineArgs(optionDefinitions)
    if (options.help) {
        const usage = commandLineUsage([
            {
                header: 'Studio',
                content: 'A web portal to issue and verify credentails'
            },
            {
                header: 'Options',
                optionList: optionDefinitions
            },
            {
                content: 'Project home: {underline https://github.com/hypersignprotocol/studio}'
            }
        ])
        console.log(usage)
        return false;
    } else if (options.newdb) {
        console.log("=====================Setting Up database===========================")
        await setupDb();
        console.log("=====================Setting Up database===========================")
        return false;
    } else if (options.bootstrap){
        console.log("=====================Bootstraping did/schemas===========================")
        await bootstrap();
        console.log("=====================Bootstraping did/schemas===========================")
    }
    else {
        console.log(options)
        return true;
    }
}