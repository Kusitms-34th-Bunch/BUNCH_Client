/** 실제 이미지 파일 전의 자리표시 이미지, 라벨이 적힌 색 그라데이션 SVG 데이터 주소 */
export const placeholderImage = (label: string, hue: number, size: number): string => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},45%,62%)"/>` +
    `<stop offset="1" stop-color="hsl(${(hue + 40) % 360},40%,78%)"/>` +
    `</linearGradient></defs><rect width="${size}" height="${size}" fill="url(#g)"/>` +
    `<text x="50%" y="50%" font-size="${Math.round(size / 4)}" fill="white" ` +
    `text-anchor="middle" dominant-baseline="central">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
