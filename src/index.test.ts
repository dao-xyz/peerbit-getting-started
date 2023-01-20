import { BaseDocument, MyDatabase, TextDocument } from './index.js'
import { Peerbit } from "@dao-xyz/peerbit";
import { createLibp2p, Libp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { DocumentQueryRequest, Results } from "@dao-xyz/peerbit-document";
import { Ed25519Keypair } from "@dao-xyz/peerbit-crypto";
import { serialize, deserialize } from '@dao-xyz/borsh';
import { Program } from '@dao-xyz/peerbit-program';
import { toBase64, fromBase64 } from '@dao-xyz/peerbit-crypto'

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
		fs.existsSync(directory) && fs.rmSync(directory, { recursive: true })

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


	it('can create a database with same address everytime on open', async () => {


		// when you do client.open("/peerbit/abc123xyz"), the address will be converted into a CID which will be queried from peer if you don't have it locally.
		// this can be great for online apps, but can be troublesome for apps that are mostly offline


		// In this test we are going too see that we can create a database with the same address everytime
		// by providing the "id" argument
		// so that you will not have to ask peers for database manifests if you are opening the database for the first time

		let client = await Peerbit.create(node)
		const db1 = await client.open(new MyDatabase({ id: "some-id" }))
		const address1 = db1.address;

		const db2 = await client.open(new MyDatabase({ id: "some-id" }))
		const address2 = db2.address;

		expect(address1.toString()).toEqual(address2.toString())

		// The reason why the addresses become the same is because there are no "random" properties if you assign the id
		// Internally, when you do "client.open(new MyDatabase({ id: "some-id" }))", the database will be serialized and saved
		// and the serialized bytes of new MyDatabase({ id: "some-id" }) will determine the address of the database, through a hash function

		// when new MyDatabase({ id: "some-id" }) will be serialized, it will output exactly the same bytes, every time
		// This means that the hash of the serialized bytes will be the same
		// hence the address will be the same

		// calling new MyDatabase() (without id property) will output different bytes everytime, because its id will be generated randomly

		// this is useful when you don't want to manage an address, but you want to hardcode a constructor
		// or when you wan't to create a "local" first app, where you want to be able to load the database without having to ask peers
		// how to load specific database address

		// Below are doing to showcase how you also can manually serialize/deserialize the database manifest
		// (so you can share it with peers rather than the address if you want them to be able to load the database)
		// just from a byte array

		const bytes = serialize(db2) // Uint8Array
		const base64 = toBase64(bytes);
		// you can send these 'bytes' or the base64 string to your peer, so that they can load the database address without beeing connect to anyone

		// Below is from the peer that just have seen the base64 and does not know what database it represents
		const deserializedProgram = deserialize(fromBase64(base64), Program); // We deserialize into "Program" (which could be any database)
		expect(deserializedProgram).toBeInstanceOf(MyDatabase); // If we do type checking we can see that it correctly deserialzied it into MyDatabas
		const db3 = await client.open(deserializedProgram as MyDatabase)
		expect(db3).toBeInstanceOf(MyDatabase);



	})

})

