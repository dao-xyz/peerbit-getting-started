import { BaseDocument, MyDatabase, TextDocument } from './index.js'
import { Peerbit } from "@dao-xyz/peerbit";
import { createLibp2p, Libp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { DocumentQueryRequest, Results } from "@dao-xyz/peerbit-document";
import { Ed25519Keypair } from "@dao-xyz/peerbit-crypto";

describe('suite', () => {

	let node: Libp2p
	let keypair: Ed25519Keypair

	beforeAll(async () => {
		// More info about configs here https://github.com/libp2p/js-libp2p/blob/master/doc/GETTING_STARTED.md#configuring-libp2p
		node = await createLibp2p({
			transports: [webSockets()],
			connectionEncryption: [noise()], // Make connections encrypted
			pubsub: gossipsub()  // required in this version of Peerbit, but will not in the future
		})

		// We create a keypair here to act as an identity accross our test
		// In real world app we would perhaps load this from disc, or store in browser cache
		keypair = await Ed25519Keypair.create();


	})

	afterAll(async () => {
		await node.stop()
	})


	it('start', async () => {
		const client = await Peerbit.create(node, { identity: keypair })
		const db = await client.open(new MyDatabase(),)
		console.log(db.address.toString())
		expect(db.address.toString().length).toBeGreaterThan(0) // Some address like
	})

	it('adds 100 document and search for all of them', async () => {
		const client = await Peerbit.create(node, { identity: keypair })
		const db = await client.open(new MyDatabase())
		console.log(db.address.toString())

		for (let i = 0; i < 100; i++) {
			await db.documents.put(new TextDocument("This is document #" + i))
		}

		let foundResults: Results<BaseDocument> | undefined = undefined;
		await db.documents.index.query(new DocumentQueryRequest({ queries: [] }), (results, from) => {

			foundResults = results
		}, { local: true, remote: false }) // Only search locally

		expect((foundResults.results)).toHaveLength(100)
		console.log("First document:", (foundResults.results[0].value as TextDocument).text)
	})


	it('save-load database from disc', async () => {
		let directory = './tmp/test/1';

		// Cleanup from last run
		const fs = await import('fs')
		fs.existsSync(directory) && fs.rmdirSync(directory, { recursive: true })

		// In order to get a recoverable state we need to pass 'directory' param when creating client
		// this will ensure that we create a client that store content on disc rather than in RAM
		let client = await Peerbit.create(node, { identity: keypair, directory: directory })

		// Create a db as in the test before and add some documents
		let db = await client.open(new MyDatabase())
		let address = db.address.toString();
		for (let i = 0; i < 100; i++) {
			await db.documents.put(new TextDocument("This is document #" + i))
		}

		// Stop it (stops running processes like replication and networking).
		// In "real" world apps where a server crashes, this will not be called
		// and that is fine, everything is already written to disc. 
		await client.stop()



		// reload client from same directory and see if data persists 
		client = await Peerbit.create(node, { identity: keypair, directory: './tmp/test/1/' })
		db = await client.open<MyDatabase>(address)


		await db.load(); // Call "load" to load the stored database from disc


		let foundResults: Results<BaseDocument> | undefined = undefined;

		await db.documents.index.query(new DocumentQueryRequest({ queries: [] }), (results, from) => {
			foundResults = results
		}, { local: true, remote: false }) // Only search locally

		expect((foundResults.results)).toHaveLength(100)
		console.log("First document:", (foundResults.results[0].value as TextDocument).text)

	})

})

