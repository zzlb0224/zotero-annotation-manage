export function getColorBrightness(color: string) {
  const r = parseInt(color.substring(1, 3), 16);
  const g = parseInt(color.substring(3, 5), 16);
  const b = parseInt(color.substring(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness;
}
export function getRandomColor() {
  const letters = "0123456789abcdef";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
export function getNewColor(colorStr: string) {
  const colors = colorStr.split(",").filter((c) => c !== "");
  let color = "";
  for (let i = 0; i < 1e4; i++) {
    color = getRandomColor();
    const brightness = getColorBrightness(color);
    if (130 < brightness && brightness < 250 && !colors.includes(color)) {
      return color;
    }
  }
  return color;
}
