function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}
export function getColorDifference(color1: string, color2: string) {
  const hsl1 = rgbToHsl(parseInt(color1.substring(1, 3), 16), parseInt(color1.substring(3, 5), 16), parseInt(color1.substring(5, 7), 16));
  const hsl2 = rgbToHsl(parseInt(color2.substring(1, 3), 16), parseInt(color2.substring(3, 5), 16), parseInt(color2.substring(5, 7), 16));
  const difference = Math.sqrt((hsl1[0] - hsl2[0]) ** 2 + (hsl1[1] - hsl2[1]) ** 2 + (hsl1[2] - hsl2[2]) ** 2);
  return difference;
}
export function getColorBrightness(color: string) {
  const r = parseInt(color.substring(1, 3), 16);
  const g = parseInt(color.substring(3, 5), 16);
  const b = parseInt(color.substring(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness;
}
export function getRandomColor() {
  const letters = '0123456789abcdef';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
export function getNewColor(colorStr:string){
  const colors =colorStr.split(",").filter(c => c !== "")
  for(let i=0;i<1e5;i++){
    const color = getRandomColor()
    const b=getColorBrightness(color)    
    if(b<240&&b>160&&!colors.includes(color)){
      const ds= colors.map(c=>getColorDifference(c,color)) 
      ztoolkit.log(ds) 
      return color
    }
  }
}
