import { readFileSync } from "fs";
import { deflateSync, inflateSync } from "zlib";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export type Rgb = [number, number, number];

export type PdfOp =
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: Rgb }
  | {
      kind: "text";
      text: string;
      x: number;
      y: number;
      size: number;
      bold?: boolean;
      color: Rgb;
      align?: "left" | "right";
    }
  | { kind: "image"; name: string; x: number; y: number; w: number; h: number }
  | { kind: "round"; x: number; y: number; w: number; h: number; r: number; fill: Rgb }
  | { kind: "circle"; x: number; y: number; r: number; fill: Rgb };

export const pdfPage = { width: 595, height: 842 };

type LogoImage = {
  width: number;
  height: number;
  rgb: Buffer;
  alpha: Buffer;
};

function ascii(value: string) {
  return value.replace(/[^\x20-\x7E]/g, " ");
}

function escapePdf(value: string) {
  return ascii(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function rgb(color: Rgb) {
  return color.map((channel) => channel.toFixed(3)).join(" ");
}

function textWidth(text: string, size: number, bold: boolean) {
  return ascii(text).length * size * (bold ? 0.56 : 0.5);
}

function paeth(left: number, up: number, upLeft: number) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

function decodeLogo(file: Buffer): LogoImage {
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.subarray(offset + 4, offset + 8).toString("ascii");
    const data = file.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const channels = 4;
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  let cursor = 0;
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    cursor += 1;
    const row = Buffer.alloc(stride);
    for (let index = 0; index < stride; index += 1) {
      const value = raw[cursor];
      cursor += 1;
      const left = index >= channels ? row[index - channels] : 0;
      const up = previous[index];
      const upLeft = index >= channels ? previous[index - channels] : 0;
      if (filter === 1) row[index] = (value + left) & 255;
      else if (filter === 2) row[index] = (value + up) & 255;
      else if (filter === 3) row[index] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) row[index] = (value + paeth(left, up, upLeft)) & 255;
      else row[index] = value;
    }
    row.copy(pixels, y * stride);
    previous = row;
  }

  const color = Buffer.alloc(width * height * 3);
  const alpha = Buffer.alloc(width * height);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const source = pixel * 4;
    color[pixel * 3] = pixels[source];
    color[pixel * 3 + 1] = pixels[source + 1];
    color[pixel * 3 + 2] = pixels[source + 2];
    alpha[pixel] = pixels[source + 3];
  }
  return { width, height, rgb: color, alpha };
}

const logoFile = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../assets/company.png"));
const logo = decodeLogo(logoFile);
const logoRgb = deflateSync(logo.rgb);
const logoAlpha = deflateSync(logo.alpha);

function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  const curve = 0.5522847498 * radius;
  const right = x + w;
  const top = y + h;
  return [
    `${(x + radius).toFixed(2)} ${y.toFixed(2)} m`,
    `${(right - radius).toFixed(2)} ${y.toFixed(2)} l`,
    `${(right - radius + curve).toFixed(2)} ${y.toFixed(2)} ${right.toFixed(2)} ${(y + radius - curve).toFixed(2)} ${right.toFixed(2)} ${(y + radius).toFixed(2)} c`,
    `${right.toFixed(2)} ${(top - radius).toFixed(2)} l`,
    `${right.toFixed(2)} ${(top - radius + curve).toFixed(2)} ${(right - radius + curve).toFixed(2)} ${top.toFixed(2)} ${(right - radius).toFixed(2)} ${top.toFixed(2)} c`,
    `${(x + radius).toFixed(2)} ${top.toFixed(2)} l`,
    `${(x + radius - curve).toFixed(2)} ${top.toFixed(2)} ${x.toFixed(2)} ${(top - radius + curve).toFixed(2)} ${x.toFixed(2)} ${(top - radius).toFixed(2)} c`,
    `${x.toFixed(2)} ${(y + radius).toFixed(2)} l`,
    `${x.toFixed(2)} ${(y + radius - curve).toFixed(2)} ${(x + radius - curve).toFixed(2)} ${y.toFixed(2)} ${(x + radius).toFixed(2)} ${y.toFixed(2)} c`,
    "h",
  ].join("\n");
}

function circlePath(x: number, y: number, r: number) {
  const curve = 0.5522847498 * r;
  return [
    `${x.toFixed(2)} ${(y + r).toFixed(2)} m`,
    `${(x + curve).toFixed(2)} ${(y + r).toFixed(2)} ${(x + r).toFixed(2)} ${(y + curve).toFixed(2)} ${(x + r).toFixed(2)} ${y.toFixed(2)} c`,
    `${(x + r).toFixed(2)} ${(y - curve).toFixed(2)} ${(x + curve).toFixed(2)} ${(y - r).toFixed(2)} ${x.toFixed(2)} ${(y - r).toFixed(2)} c`,
    `${(x - curve).toFixed(2)} ${(y - r).toFixed(2)} ${(x - r).toFixed(2)} ${(y - curve).toFixed(2)} ${(x - r).toFixed(2)} ${y.toFixed(2)} c`,
    `${(x - r).toFixed(2)} ${(y + curve).toFixed(2)} ${(x - curve).toFixed(2)} ${(y + r).toFixed(2)} ${x.toFixed(2)} ${(y + r).toFixed(2)} c`,
    "h",
  ].join("\n");
}

function paint(ops: PdfOp[]) {
  const commands = ops.map((op) => {
    if (op.kind === "rect") {
      return `${rgb(op.fill)} rg\n${op.x} ${op.y} ${op.w} ${op.h} re f`;
    }
    if (op.kind === "round") {
      return `${rgb(op.fill)} rg\n${roundedRectPath(op.x, op.y, op.w, op.h, op.r)}\nf`;
    }
    if (op.kind === "circle") {
      return `${rgb(op.fill)} rg\n${circlePath(op.x, op.y, op.r)}\nf`;
    }
    if (op.kind === "image") {
      return `q\n${op.w} 0 0 ${op.h} ${op.x} ${op.y} cm\n/${op.name} Do\nQ`;
    }
    const width = textWidth(op.text, op.size, Boolean(op.bold));
    const x = op.align === "right" ? op.x - width : op.x;
    const font = op.bold ? "/F2" : "/F1";
    return [
      `${rgb(op.color)} rg`,
      "BT",
      `${font} ${op.size} Tf`,
      `1 0 0 1 ${x.toFixed(2)} ${op.y.toFixed(2)} Tm`,
      `(${escapePdf(op.text)}) Tj`,
      "ET",
    ].join("\n");
  });
  return ["1 J 1 j", ...commands].join("\n");
}

function imageObject(stream: Buffer, dictionary: string) {
  return Buffer.concat([
    Buffer.from(`${dictionary} /Length ${stream.length} >>\nstream\n`, "latin1"),
    stream,
    Buffer.from("\nendstream", "latin1"),
  ]);
}

export function buildPdfDocument(pages: PdfOp[][], title: string) {
  const source = pages.length > 0 ? pages : [];
  const fontRegular = 3 + source.length * 2;
  const fontBold = fontRegular + 1;
  const image = fontBold + 1;
  const mask = image + 1;
  const info = mask + 1;
  const kids = source.map((_, index) => `${3 + index * 2} 0 R`).join(" ");
  const objects: Array<string | Buffer> = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids}] /Count ${source.length} >>`,
  ];

  source.forEach((ops, pageIndex) => {
    const contentId = 4 + pageIndex * 2;
    const stream = paint(ops);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfPage.width} ${pdfPage.height}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> /XObject << /Im1 ${image} 0 R >> >> >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  objects.push(
    imageObject(
      logoRgb,
      `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask ${mask} 0 R`,
    ),
  );
  objects.push(
    imageObject(
      logoAlpha,
      `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`,
    ),
  );
  objects.push(`<< /Title (${escapePdf(title)}) /Creator (Wealth Discovery AIF Client Portal) >>`);

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  let cursor = chunks[0].length;
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(cursor);
    const body = typeof object === "string" ? Buffer.from(object, "latin1") : object;
    const piece = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`, "latin1"),
      body,
      Buffer.from("\nendobj\n", "latin1"),
    ]);
    chunks.push(piece);
    cursor += piece.length;
  });

  const xref = cursor;
  let trailer = `xref\n0 ${objects.length + 1}\n`;
  trailer += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    trailer += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  trailer += `trailer << /Size ${objects.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  chunks.push(Buffer.from(trailer, "latin1"));
  return Buffer.concat(chunks);
}

export function statementDownloadName(fileName: string) {
  return fileName.startsWith("Wealth-Discovery-") ? fileName : `Wealth-Discovery-${fileName}`;
}
