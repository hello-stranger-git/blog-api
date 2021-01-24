const koa = require('koa');
const koaRouter = require('koa-router');
const koaBody = require('koa-body');
const kosStaticCache = require('koa-static-cache');
const mySql = require('mysql2')
const koaJwt = require('koa-jwt')
const jsonWebToken = require('jsonwebtoken')



let user;//用于保存登陆用户信息
const connection = mySql.createConnection({//链接数据库
    host: '127.0.0.1',
    user: 'root',
    password:'123',
    database: 'album'
  });

function query(sql,values){//数据库操作
    return new Promise((resolve,reject)=>{
        connection.query(sql, values, function(err, results) {
            if (err) {
                reject(err);
            } else{
                resolve(results);
            }
        });
    })
}


const app =new koa();
app.use(koaBody({//设置接收参数的方式
    multipart:true,
    formidable: {
        uploadDir: __dirname + '/static/upload',
        keepExtensions: true
    }
}));
app.use(kosStaticCache({
    prefix:'/upload',
    dir:__dirname + '/static/upload',
    // gzip: true,
    dynamic: true
}))//静态资源

const secret = "loginSuccess"
app.use(koaJwt({ secret }).unless({ path: [/^\/login/] }));//权限鉴定
const router = new koaRouter();


router.post('/upload',async ctx=>{//上传图片
    let {path,type,size} = ctx.request.files.image;
    path = path.replace(/\\/g,'/')
    let lastIndex = path.lastIndexOf('/');
    let filename = path.substring(lastIndex + 1);
    let rs = await query(
        "insert into `images` (`filename`, `type`, `size`, `uid`) values (?, ?, ?, ?)",
        [filename, type, size, user.id]
    )
    ctx.body={
        code: 0,
        message: '上传成功',
        data: {
            filename
        }
    }
})

router.get('/getphotos',async ctx=>{//获取图片
    console.log(user.id)
    let data = await query(
        "select * from `images` where `uid`=?",
        [user.id]
    );
    ctx.body = {
        code: 0,
        message: '查询图片成功',
        data
    }
})


router.post('/login',async ctx=>{
    let {username,password} = ctx.request.body;


    if(!username||!password){
        ctx.body = {
            code: 1,
            message: '用户名和密码不能为空'
        }
        return
    }

    let [data] = await query(
        "select * from user where username = ? And password = ?",
        [username,password]
    )
    
    if (!data) {
        ctx.body = {
            code: 2,
            message: '用户不存在或密码错误'
        }
        return;
    }

    user = data;
    let token = jsonWebToken.sign({id: data.id, name: data.username}, secret);
    ctx.set('authorization',token)
    ctx.body = {
        code:0,
        message:"登陆成功",
        data
    }
})


app.use(router.routes());
app.listen(8888,()=>{
    console.log('启动album-api,监听8888端口')
});
