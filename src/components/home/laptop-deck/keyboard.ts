/**
 * LAPTOP DECK — keyboard layout. Pure data, no React.
 * The keyboard sits on the isometric keybed (RX is the SVG x of each row).
 */

export type KeyD = {
  l: string;
  x: number;
  w: number;
  y?: number;
  id?: string;
  nub?: boolean;
};

/* Keyboard is laid out with a +10 inset so the keycaps sit symmetrically
   inside the recessed keybed (well spans x=7..183). */
export const ROWS: { y: number; keys: KeyD[] }[] = [
  {
    y: 0,
    keys: [
      { l: "Esc", x: 10, w: 9 },
      { l: "", x: 22, w: 9 },
      { l: "", x: 34, w: 9 },
      { l: "", x: 46, w: 9 },
      { l: "", x: 58, w: 9 },
      { l: "", x: 70, w: 9 },
      { l: "", x: 82, w: 9 },
      { l: "", x: 94, w: 9 },
      { l: "", x: 106, w: 9 },
      { l: "", x: 118, w: 9 },
      { l: "", x: 130, w: 9 },
      { l: "", x: 142, w: 9 },
      { l: "", x: 154, w: 9 },
      { l: "Del", x: 166, w: 13 },
    ],
  },
  {
    y: 16,
    keys: [
      { l: "`", x: 10, w: 9 },
      { l: "1", x: 22, w: 9 },
      { l: "2", x: 34, w: 9 },
      { l: "3", x: 46, w: 9 },
      { l: "4", x: 58, w: 9 },
      { l: "5", x: 70, w: 9 },
      { l: "6", x: 82, w: 9 },
      { l: "7", x: 94, w: 9 },
      { l: "8", x: 106, w: 9 },
      { l: "9", x: 118, w: 9 },
      { l: "0", x: 130, w: 9 },
      { l: "-", x: 142, w: 9 },
      { l: "=", x: 154, w: 9 },
      { l: "Bksp", x: 166, w: 13, id: "BACKSPACE" },
    ],
  },
  {
    y: 32,
    keys: [
      { l: "Tab", x: 10, w: 14 },
      { l: "q", x: 27, w: 9, id: "Q" },
      { l: "w", x: 39, w: 9, id: "W" },
      { l: "e", x: 51, w: 9, id: "E" },
      { l: "r", x: 63, w: 9, id: "R" },
      { l: "t", x: 75, w: 9, id: "T" },
      { l: "y", x: 87, w: 9, id: "Y" },
      { l: "u", x: 99, w: 9, id: "U" },
      { l: "i", x: 111, w: 9, id: "I" },
      { l: "o", x: 123, w: 9, id: "O" },
      { l: "p", x: 135, w: 9, id: "P" },
      { l: "[", x: 147, w: 9 },
      { l: "]", x: 159, w: 9 },
      { l: "\\", x: 171, w: 8 },
    ],
  },
  {
    y: 48,
    keys: [
      { l: "Caps", x: 10, w: 15 },
      { l: "a", x: 28, w: 9, id: "A" },
      { l: "s", x: 40, w: 9, id: "S" },
      { l: "d", x: 52, w: 9, id: "D" },
      { l: "f", x: 64, w: 9, id: "F", nub: true },
      { l: "g", x: 76, w: 9, id: "G" },
      { l: "h", x: 88, w: 9, id: "H" },
      { l: "j", x: 100, w: 9, id: "J", nub: true },
      { l: "k", x: 112, w: 9, id: "K" },
      { l: "l", x: 124, w: 9, id: "L" },
      { l: ";", x: 136, w: 9 },
      { l: "'", x: 148, w: 9 },
      { l: "Enter", x: 160, w: 19, id: "ENTER" },
    ],
  },
  {
    y: 64,
    keys: [
      { l: "Shift", x: 10, w: 20 },
      { l: "z", x: 33, w: 9, id: "Z" },
      { l: "x", x: 45, w: 9, id: "X" },
      { l: "c", x: 57, w: 9, id: "C" },
      { l: "v", x: 69, w: 9, id: "V" },
      { l: "b", x: 81, w: 9, id: "B" },
      { l: "n", x: 93, w: 9, id: "N" },
      { l: "m", x: 105, w: 9, id: "M" },
      { l: ",", x: 117, w: 9 },
      { l: ".", x: 129, w: 9 },
      { l: "/", x: 141, w: 9 },
      { l: "Shift", x: 153, w: 26 },
    ],
  },
  {
    y: 80,
    keys: [
      { l: "Ctrl", x: 10, w: 13 },
      { l: "Alt", x: 26, w: 13 },
      { l: "Meta", x: 42, w: 18 },
      { l: "Space", x: 63, w: 60, id: "Space" },
      { l: "Meta", x: 126, w: 18 },
      { l: "Alt", x: 147, w: 13 },
      { l: "Ctrl", x: 163, w: 13 },
    ],
  },
];