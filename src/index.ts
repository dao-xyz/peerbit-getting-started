import { field, variant } from "@dao-xyz/borsh";
import { Program } from "@dao-xyz/peerbit-program";
import { Documents } from "@dao-xyz/peerbit-document";
import { v4 as uuid } from 'uuid';


// Abstract document definition we can create many kinds of document types from
export class BaseDocument { }


// We version our documents with a single byte, so in the future, if we want to upgrade our document definition
// we can do @variant(1) which allows us to store and manage both Documents of type variant 0 and variant 1 in our Document database
// (This is not needed but recommended)
@variant(0)
export class TextDocument extends BaseDocument {

	@field({ type: 'string' })
	id: string

	@field({ type: 'string' })
	text: string

	constructor(text: string) {
		super()
		this.id = uuid()
		this.text = text;
	}
}

// MyDatabase needs to extends Program so we later can "open" it using the Peerbit client
@variant("my-database")
export class MyDatabase extends Program {

	// We create an ID field so that the hash of the database/program can be unique defined by this
	// If this field is omitted calling .open(new MyDataBase()) would yield same address everytime, which is sometimes wanted, sometimes not
	@field({ type: 'string' })
	id: string;

	@field({ type: Documents })
	documents: Documents<BaseDocument>

	constructor(properties?: { id?: string }) {
		super()
		this.id = properties?.id || uuid()
		this.documents = new Documents()
	}

	async setup() {
		// this will be invoked on startup
		await this.documents.setup({ type: BaseDocument, index: { key: 'id' } })
	}
}

