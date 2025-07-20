import "dotenv/config";
import { YankiConnect } from "yanki-connect";
import { ElevenLabsClient} from "@elevenlabs/elevenlabs-js";

type CardInfo = Awaited<ReturnType<YankiConnect["card"]["cardsInfo"]>>[number];

const keyElevenLabs = process.env.ELEVENLABS_API_KEY;

if (!keyElevenLabs) throw new Error("The elevenLabs API key couldn't be found");

const client = new YankiConnect({host: process.env.HOST_NAME});
const elevenlabs = new ElevenLabsClient({apiKey: keyElevenLabs});

// Charlie
const voiceId = "IKne3meq5aSn9XLyUdCD";

// 1 = red, 2 = orange, ect...
const flagNumber = "2";



const cards = await client.card.findCards({ query: `flag:${flagNumber}` });
if (cards.length === 0) throw new Error("No card found with the specific flag");
const cardsInfo = await client.card.cardsInfo({ cards });


function checkFieldValueExistence(card: CardInfo, nameField: string) {
    if (!card.fields[nameField]) throw new Error("Couldn't find the field");

    const cardFieldValue = card.fields[nameField].value;
    
    if (cardFieldValue === "") {
        return false;
    } else {
        return true;
    }
    
}

async function createAudio(text: string) {
    if (!text) throw new Error("The text to be converted into audio was empty or undefined");

    const audio = await elevenlabs.textToSpeech.convertWithTimestamps(voiceId, {
        text: text,
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128",
    })

    return audio;
}

// In order to have the voice pronounce every single letter.
// It's optional and can be removed.
function customFieldModification(card: CardInfo) {
    const fieldHarakat = card.fields.Harakat.value;

    // Clear all character including Sukun except arabic and space around the hyphen.
    // TODO: Honestly doesn't do much currently could be largerly improved
    const regexArabicAllChar = /(?:[\u0600-\u0651\u0653-\u06ff]|\s*-\s*)|(.)/gu;
    if (fieldHarakat.includes("-")) {
        const replaced = fieldHarakat.replace(regexArabicAllChar, (fullMatch, capture) => {
            if (capture) return "";
            return fullMatch;
        })
        return replaced;
    }
    return fieldHarakat;
}

async function run(cardsToChange: CardInfo[]) {
    let count = 0;
    
    for (let i=0;i < cardsToChange.length;i++) {
        const card = cardsToChange[i];
        if (checkFieldValueExistence(card, "Harakat") && !checkFieldValueExistence(card, "Audio")) {
            const customizedField = customFieldModification(card);
            const audio = await createAudio(customizedField);
            await client.note.updateNoteFields({ note: {
                id: card.note,
                audio: [{ 
                    filename: `${card.cardId}.mp3`,
                    fields: ["Audio"],
                    data: audio.audioBase64
                }],
                fields: {}
            }})
            count++;
            console.log(`Successfully updated card: ${card.note}`)
        }
        continue;
    }

    console.log(`${count} audio have been added.`)
    return;
}


run(cardsInfo)




