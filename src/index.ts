import { field, variant } from "@dao-xyz/borsh";
import { Program } from "@peerbit/program";
import { Documents } from "@peerbit/document";
import { v4 as uuid } from "uuid";

// We version our documents with a single byte, so in the future, if we want to upgrade our document definition
// we can do @variant(1) which allows us to store and manage both Documents of type variant 0 and variant 1 in our Document database
// (This is not needed but recommended)
@variant(0)
export class TextDocument {

	@field({ type: "string" })
	id: string;

	@field({ type: "string" })
	text: string;

	constructor(text: string) {
		this.id = uuid();
		this.text = text;
	}
}

// MyDatabase needs to extends Program so we later can "open" it using the Peerbit client
@variant("my-database")
export class MyDatabase extends Program {
	@field({ type: Documents })
	documents: Documents<TextDocument>;

	constructor(properties?: { id?: Uint8Array }) {
		super();

		// We create an ID field so that the hash of the database/program can be unique defined by this
		// If this field is omitted calling .open(new MyDataBase()) would yield same address everytime, which is sometimes wanted, sometimes not

		this.documents = new Documents({ id: properties?.id });
	}

	async open() {
		// this will be invoked on startup
		await this.documents.open({ type: TextDocument, index: { idProperty: "id" } });
	}
}
