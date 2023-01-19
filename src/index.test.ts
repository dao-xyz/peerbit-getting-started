import { BaseDocument, MyDatabase, TextDocument } from './index.js'
import { Peerbit } from "@dao-xyz/peerbit";
import { createLibp2p, Libp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { DocumentQueryRequest, Results } from "@dao-xyz/peerbit-document";

describe('suite', () => {

	let node: Libp2p
	beforeAll(async () => {
		// More info about configs here https://github.com/libp2p/js-libp2p/blob/master/doc/GETTING_STARTED.md#configuring-libp2p
		node = await createLibp2p({
			transports: [webSockets()],
			connectionEncryption: [noise()], // Make connections encrypted
			pubsub: gossipsub()  // required in this version of Peerbit, but will not in the future
		})
	})

	afterAll(async () => {
		await node.stop()
	})


	it('start', async () => {
		const client = await Peerbit.create(node)
		const db = await client.open(new MyDatabase())
		console.log(db.address.toString())
		expect(db.address.toString().length).toBeGreaterThan(0) // Some address like
	})

	it('adds 100 document and search for all of them', async () => {
		const client = await Peerbit.create(node)
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

})

