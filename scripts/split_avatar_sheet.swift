import Foundation
import CoreGraphics
import ImageIO

struct Avatar {
    let name: String
    let x: Int
    let y: Int
    let size: Int
    let radius: Double
}

let sourcePath = "original-animal-sheet.png"
let outputDir = "prototype/assets/generated-animals"

let avatars = [
    Avatar(name: "capybara", x: 0, y: 0, size: 512, radius: 238),
    Avatar(name: "bunny", x: 512, y: 0, size: 512, radius: 238),
    Avatar(name: "sheep", x: 1024, y: 0, size: 512, radius: 238),
    Avatar(name: "tiger", x: 0, y: 512, size: 512, radius: 238),
    Avatar(name: "crocodile", x: 512, y: 512, size: 512, radius: 238),
    Avatar(name: "cat", x: 1024, y: 512, size: 512, radius: 238)
]

let sourceURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent(sourcePath)
let outputURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent(outputDir)

guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
      let sheet = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fputs("Could not read \(sourcePath)\n", stderr)
    exit(1)
}

try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)

func writePNG(_ image: CGImage, to url: URL) -> Bool {
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil) else {
        return false
    }
    CGImageDestinationAddImage(dest, image, nil)
    return CGImageDestinationFinalize(dest)
}

for avatar in avatars {
    let crop = CGRect(x: avatar.x, y: avatar.y, width: avatar.size, height: avatar.size)
    guard let image = sheet.cropping(to: crop) else {
        fputs("Could not crop \(avatar.name)\n", stderr)
        exit(1)
    }

    let width = avatar.size
    let height = avatar.size
    let bytesPerPixel = 4
    let bytesPerRow = width * bytesPerPixel
    var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)
    let colorSpace = CGColorSpaceCreateDeviceRGB()

    guard let ctx = CGContext(
        data: &pixels,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        fputs("Could not create context\n", stderr)
        exit(1)
    }

    ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

    let center = Double(width) / 2.0
    let radius = avatar.radius
    let feather = 4.0

    for y in 0..<height {
        for x in 0..<width {
            let dx = Double(x) + 0.5 - center
            let dy = Double(y) + 0.5 - center
            let distance = sqrt(dx * dx + dy * dy)
            if distance > radius {
                let index = (y * width + x) * bytesPerPixel
                if distance < radius + feather {
                    let keep = max(0.0, min(1.0, (radius + feather - distance) / feather))
                    pixels[index + 3] = UInt8(Double(pixels[index + 3]) * keep)
                } else {
                    pixels[index + 3] = 0
                }
            }
        }
    }

    guard let outCtx = CGContext(
        data: &pixels,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ), let outputImage = outCtx.makeImage() else {
        fputs("Could not create output image for \(avatar.name)\n", stderr)
        exit(1)
    }

    let destination = outputURL.appendingPathComponent("\(avatar.name).png")
    guard writePNG(outputImage, to: destination) else {
        fputs("Could not write \(destination.path)\n", stderr)
        exit(1)
    }
    print("Wrote \(destination.path)")
}
