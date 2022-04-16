const Koa = require('koa');
const router = require('koa-router')();
const cors = require('koa2-cors');
const koaBody = require('koa-body');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid')
const koaStatic = require('koa-static');

const outputPath = path.resolve(__dirname, 'resources');
const app = new Koa();
let currChunk = {}; // 当前 chunk 信息
// 静态资源
app.use(koaStatic(path.join(__dirname, 'resources')));
/*  */
// 处理跨域
app.use(cors({
  //设置允许来自指定域名请求
  origin: (ctx) => {
    return '*' // 允许来自所有域名请求
  },
  maxAge: 5, //指定本次预检请求的有效期，单位为秒。
  credentials: true, //是否允许发送Cookie
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], //设置所允许的HTTP请求方法
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'], //设置服务器支持的所有头信息字段
  exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'] //设置获取其他自定义字段
}));


// 处理 body 数据
app.use(koaBody({}));


// 上传请求
router.post(
  '/api/upload',
  // 处理文件 form-data 数据
  koaBody({
    multipart: true,
    formidable: {
      uploadDir: outputPath,
      onFileBegin: (name, file) => {
        const [filename, fileHash, index] = name.split('vtest-vtest');
        const dir = path.join(outputPath, filename);
        // 保存当前 chunk 信息，发生错误时进行返回
        currChunk = {
          filename,
          fileHash,
          index
        };

        // 检查文件夹是否存在如果不存在则新建文件夹
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
        }

        // 覆盖文件存放的完整路径
        file.path = `${dir}/${fileHash}-${index}`;
      },
      onError: (error) => {
        app.status = 400;
        app.body = { code: 400, msg: "上传失败", data: currChunk };
        return;
      },
    },
  }),
  // 处理响应
  async (ctx) => {
    ctx.set("Content-Type", "application/json");
    ctx.body = JSON.stringify({
      code: 2000,
      message: 'upload successfully！'
    });

  });

// 合并请求
router.post('/api/mergeChunks', async (ctx) => {
  const { filename, size } = ctx.request.body;
  console.log("🚀【文件名】", filename.substr(filename.lastIndexOf(".")));
  // 合并 chunks
  const newFileName = 'test_' + nanoid() + '_test' + filename.substr(filename.lastIndexOf("."))
  console.log(newFileName)
  console.log(filename)
  // return false
  await mergeFileChunk(path.join(outputPath, newFileName), filename, size);
  // 处理响应
  ctx.set("Content-Type", "application/json");
  ctx.body = JSON.stringify({
    data: {
      code: 200,
      filename,
      link: "/" + newFileName,
      size
    },
    message: 'merge chunks successful！'
  });
});

// 通过管道处理流 
const pipeStream = (path, writeStream) => {
  return new Promise(resolve => {
    const readStream = fs.createReadStream(path);
    readStream.pipe(writeStream);
    readStream.on("end", () => {
      fs.unlinkSync(path);
      resolve();
    });
  });
}

// 合并切片
const mergeFileChunk = async (filePath, filename, size) => {
  const chunkDir = path.join(outputPath, filename);
  const chunkPaths = fs.readdirSync(chunkDir);

  if (!chunkPaths.length) return;

  // 根据切片下标进行排序，否则直接读取目录的获得的顺序可能会错乱
  chunkPaths.sort((a, b) => a.split("vtest-vtest")[1] - b.split("vtest-vtest")[1]);
  console.log("chunkPaths = ", chunkPaths);

  await Promise.all(
    chunkPaths.map((chunkPath, index) =>
      pipeStream(
        path.resolve(chunkDir, chunkPath),
        // 指定位置创建可写流
        fs.createWriteStream(filePath, {
          start: index * size,
          end: (index + 1) * size
        })
      )
    )
  );

  // 合并后删除保存切片的目录
  // fs.mrdir(chunkDir)
  // fs.rmdirSync(chunkDir);
  // 直接删除空的文件目录
  fs.rmdir(chunkDir, function(error) {
    if (error) {
      console.log(error);
      return false;
    }
    console.log('删除目录成功');
    return true
  })

};

// 注册路由
app.use(router.routes(), router.allowedMethods())

// 启动服务，监听端口
app.listen(3002, (error) => {
  if (!error) {
    console.log('server is runing at port 3002...');
  }
});