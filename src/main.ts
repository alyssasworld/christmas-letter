import '@fontsource/pixelify-sans/400.css'; // OFL: dialog body text, and the fallback if Pixelta is missing
import './style.css';
import { mountGlobeScreen } from './screens/globe.ts';
import { mountLetterScreen } from './screens/letter.ts';

let letter: { open: () => void } | undefined;
const globe = await mountGlobeScreen(() => letter?.open()); // a photo opens the letter
letter = await mountLetterScreen(globe);
// test hook: ?screen=letter skips the photo that normally opens the letter
if (new URLSearchParams(location.search).get('screen') === 'letter') letter.open();
