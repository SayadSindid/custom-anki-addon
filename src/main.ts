import "dotenv/config";
import { YankiConnect } from "yanki-connect";


const client = new YankiConnect({host: process.env.HOST_NAME});

const decks = await client.deck.deckNames();

console.log(decks)