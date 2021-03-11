const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api')
const { cryptoWaitReady } = require('@polkadot/util-crypto')
const BN = require('bn.js')

const custrom_types = {};

const provider = new WsProvider('ws://127.0.0.1:9944')
const api = new ApiPromise({ provider, types: custrom_types })
let nonce = 0

const main = async () => {
    console.log('Start connecting ...')
    api.on('connected', () => console.log('Connection established'))
    api.on('error', err => console.log('API connection failed: ', err))
    api.on('ready', async () => {
        console.log('API is ready')

        // Retrieve the chain & node information information via rpc calls
        const [nodeName, nodeVersion] = await Promise.all([
            api.rpc.system.name(),
            api.rpc.system.version()
        ])

        console.log(`We have connected to ${nodeName}-v${nodeVersion}`)

        await cryptoWaitReady()

        const keyring = new Keyring({ type: 'sr25519' })
        // alice is sudo on test mode
        const sudo_account = keyring.addFromUri('//Alice')
        const donut_account = keyring.addFromUri('//Dave')
        const steem_account = '0x' + Buffer.from("steem user").toString('hex')
        const bridge_sig = '0x' + Buffer.from('dummy signature').toString('hex')
        const bn_decimals = new BN(api.registry.chainDecimals[0]);

        console.log('steem account: ', steem_account)

        const issue_donut = async () => {
            console.log('--- Submitting extrinsic to issue DNUT into donut account: ', donut_account.address, ' ---')

            if (!nonce) {
                nonce = (await api.query.system.account(sudo_account.address)).nonce;
            }
            const unsub = await api.tx.sudo
            .sudo(
                api.tx.donutCore.issueDonut(donut_account.address, steem_account, new BN(200000000000000), bridge_sig)
            )
            .signAndSend(sudo_account, { nonce: nonce, era: 0 }, (result) => {
                console.log(`Current status is ${result.status}`)
                if (result.status.isInBlock) {
                    console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
                } else if (result.status.isFinalized) {
                    console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
                    unsub()
                }
            })
            nonce += 1
        }

        const burn_donut = async () => {
            console.log('--- Submitting extrinsic to burn DNUT from donut account: ', donut_account.address, ' ---')

            if (!nonce) {
                nonce = (await api.query.system.account(sudo_account.address)).nonce;
            }
    
            const unsub = await api.tx.sudo
            .sudo(
                api.tx.donutCore.burnDonut(donut_account.address, steem_account, new BN(100000000000000), bridge_sig)
            )
            .signAndSend(sudo_account, { nonce: nonce, era: 0 }, (result) => {
                console.log(`Current status is ${result.status}`)
                if (result.status.isInBlock) {
                    console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
                } else if (result.status.isFinalized) {
                    console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
                    unsub()
                }
            })
            nonce += 1
        }

        await issue_donut()
        await burn_donut()

    })
}

main().catch((error) => {
    console.error(error)
    process.exit(-1)
  })