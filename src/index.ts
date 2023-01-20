import { field, variant } from "@dao-xyz/borsh";
import { Program } from "@dao-xyz/peerbit-program";
import { Documents, DocumentIndex } from "@dao-xyz/peerbit-document";
import { nanoid } from 'nanoid';


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
		this.id = nanoid()
		this.text = text;
	}
}

@variant("my-database")
export class MyDatabase extends Program {

	@field({ type: Documents })
	documents: Documents<BaseDocument>

	constructor(properties?: { id: string }) {
		super(properties)
		this.documents = new Documents({ index: new DocumentIndex({ indexBy: 'id' }) })
	}

	async setup() {
		// this will be invoked on startup
		await this.documents.setup({ type: BaseDocument })
	}
}

