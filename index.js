const Jimp = require('jimp')

// изменение размера картинки
// допустим нам важно что бы картинка всегда имела ширину 600, независимо от того какого она была размера, больше или меньше, а высота нам не так важна, так что если она не будет задана то Jimp автоматически ее масштабирует
function resizeImg (image, w = 400, h) {
  if (!h) {
    h = Jimp.AUTO
  }
  return image.resize(w, h, Jimp.RESIZE_NEAREST_NEIGHBOR)
}

// добавление картинки-градиента для неоднородного затемнения
async function gradientToImg (image) {
  let img = image
  let imgWidth = img.bitmap.width
  let imgHeight = img.bitmap.height
  let gradient = await Jimp.read('./gradient.png')
  // подстраиваем размер градиента к картинке
  gradient = gradient.cover(imgWidth, imgHeight)
  //
  img = await img.composite(gradient, 0, 0, [Jimp.BLEND_SOURCE_OVER, 0.5, 0.5])
  //
  return img
}

// ватармарк в виде большего количества повторяющегося текста идущего на искасок
// текст не задан заранее, так что для каждой картинки можно использовать уникальный текст - название картинки, имя автора, дату создания этой картинки и тд
async function watermarkTextToImg (image, text = 'watermark text') {
  let img = image
  let imgHeight = img.bitmap.height
  text = text + ' '
  let watermarkText = text
  const range = require('lodash/range')
  range(0, imgHeight / 50).forEach(n => {
    watermarkText = watermarkText + text
  })
  let font = await Jimp.loadFont('./fonts/FONT_ROBOTO_16_WHITE_SHADOW.fnt')
  //
  let watermarkTextImg = new Jimp(500, 30)
  watermarkTextImg = await watermarkTextImg.print(font, 0, 0, watermarkText)
  watermarkTextImg = await watermarkTextImg.rotate(45)
  watermarkTextImg = await watermarkTextImg.opacity(0.15)
  // создадим массив цифр при помощи lodash/range используя ширину картинки
  // при помощи этого массива мы заполним картинку нашим текстовым ватермарком
  let imgHeightRange = range(-imgHeight, imgHeight, 60)
  imgHeightRange.forEach(async number => {
    img = await img.composite(watermarkTextImg, 10, number, [
      Jimp.BLEND_SCREEN,
      0.5,
      0.9
    ])
  })
  //
  return img
}

// функция добавляющая картинку ватермарк в центр картинки
async function watermarkToImg (image) {
  let img = image
  let imgWidth = img.bitmap.width
  let imgHeight = img.bitmap.height
  // загружаем наш watermark
  let watermark = await Jimp.read('./watermark.png')
  // и уменьшаем его в соответствии с размером фотографии, что бы watermark всегда был чуть меньше - благодаря этому мы можем использовать очень большую картинку-ватермарк, она в любом случае поместится в фотографию, за одно делаем его прозрачным
  watermark = watermark.scaleToFit(imgWidth - 20, imgHeight - 20).opacity(0.3)
  let watermarkWidth = watermark.bitmap.width
  let watermarkHeight = watermark.bitmap.height
  // размещаем watermark поверх фотографии, благодаря тому что мы знаем размеры фотографии и самого ватермарк мы можем разместить его в центре
  img = await img.composite(
    watermark,
    imgWidth / 2 - watermarkWidth / 2,
    imgHeight / 2 - watermarkHeight / 2,
    [Jimp.BLEND_SOURCE_OVER, 0.5, 0.5]
  )
  //
  return img
}

// функция добавляющая текст и подтекст к картинке
async function textToImg (image, text, subtext) {
  let img = image
  let imgWidth = img.bitmap.width
  let imgHeight = img.bitmap.height
  // задаем шрифты для подписей
  let font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)
  let fontSubText = await Jimp.loadFont(Jimp.FONT_SANS_8_WHITE)
  //
  img = img.print(
    font,
    0,
    // -10 что бы надпись не прилегала слишком близко к нижней границе картинки
    -10,
    {
      text: text,
      // ниже определяем как позиционировать текст, здесь мы ставим его в центр по горизонтали, и в низу по вертикале
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
    },
    // задаем максимальную ширину и высоту текста такими же как и размеры самой картинки, но при этом делаем -15, это нужно что бы избежать ситуации когда текст вплотную прилегает к краю картинки
    imgWidth - 15,
    imgHeight - 15,
    // подпись под надписью
    (err, image, { x, y }) => {
      if (err) {
        console.err(err)
      }
      img.print(
        fontSubText,
        0,
        y + 5,
        {
          text: subtext,
          alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
          alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        },
        imgWidth - 15
      )
    }
  )
  return img
}

// финальная функция сборка для генератора картинок
// тут я использую именные параметры функции так как тут их набралось довольно много, а при усложнении обработки картинок их будет только больше
async function newImageGen ({
  w = 400,
  image = './foto.jpg',
  exp = './newFoto.jpg',
  text = 'some text',
  subtext = 'subtext',
  watermarkText = 'Watermark Text'
} = {}) {
  // важный момент - необходимо прочитать нашу картинку при помощи Jimp.read, иначе Jimp не сможет ничего сделать с картинкой
  let img = await Jimp.read(image)
  // вызываем наши функции в нужном порядке
  img = await resizeImg(img, w)
  img = await gradientToImg(img)
  img = await watermarkTextToImg(img, watermarkText)
  img = await watermarkToImg(img)
  img = await textToImg(img, text, subtext)
  //
  await img.quality(100).write(exp)
  //
  return img
}

// тут нам пригодится lodash что бы сделать названия картинок человечнее
// и fs что бы прочитать файлы
const fs = require('fs')
const startCase = require('lodash/startCase')
// применяем нашу функцию ко всем файлам в папке './images/import/'
function toAllImage (
  folder = './images/import/',
  expFolder = './images/export/'
) {
  fs.readdirSync(folder).forEach(file => {
    let allowedExtensions = /(\.jpg|\.jpeg|\.png)$/i
    let date = new Date()
    // применяем только к картинкам
    if (allowedExtensions.exec(file)) {
      newImageGen({
        w: 400,
        image: './images/import/' + file,
        exp: expFolder + file,
        text: startCase(file),
        // к подписи добавим текущую дату
        subtext: date.toDateString(),
        watermarkText: startCase(file + ' ' + date.toDateString())
      })
    }
  })
}
// запускаем функцию и указываем папку в которой живут не обработанные картинки, и папку куда записываем обработанные картинки
toAllImage('./images/import/', './images/export/')
