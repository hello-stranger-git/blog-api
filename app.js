const koa = require('koa');
const koaRouter = require('koa-router');
const koaBody = require('koa-body');
const kosStaticCache = require('koa-static-cache');
const mySql = require('mysql2')
const koaJwt = require('koa-jwt')
const jsonWebToken = require('jsonwebtoken')



let user;//用于保存登陆用户信息
// const connection = mySql.createConnection({//链接数据库
//     host: '120.78.82.147',
//     user: 'root',
//     password:'xyc970428',
//     database: 'album'
//   });
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
app.use(koaJwt({ secret }).unless({ path: [/^\/login/,/^\/getMessageBoard/,/^\/addMessageBoard/] }));//权限鉴定
const router = new koaRouter();


router.post('/upload',async ctx=>{//上传图片
    console.log("上传图片")
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
    console.log("获取照片")
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


//留言板添加留言
router.post("/addMessageBoard",async ctx=>{
    console.log("添加留言");
    let {name,message} = ctx.request.body;
    let rs = await query(
        "insert into `messageboard` (`name`, `message`) values (?, ?)",
        [name, message]
    );
    ctx.body = {
        code:0,
        message:"添加留言成功"
    }
}),
//获取留言板信息
router.get("/getMessageBoard",async ctx=>{
    console.log("查询留言");
    let data = await query(
        "select * from messageboard order by create_time desc",
    );
    ctx.body = {
        data,
        code:0,
        message:"查询成功"
    }
}),
//回复留言板消息
router.post("/replyMessageBoard",async ctx=>{
    console.log("回复留言");
    let {replyMessage,id} = ctx.request.body;
    let rs = await query(
        "update messageboard set reply = ? WHERE id = ?;",
        [replyMessage,id]
    );
    ctx.body = {
        code:0,
        message:"回复留言成功"
    }
}),


//获取分类信息名字
router.get("/getCategoryName",async ctx=>{
    console.log("获取分类信息名字");
    let data = await query(
        "select * from categoryname order by create_time desc",
    );
    ctx.body = {
        data,
        code:0,
        message:"查询成功"
    }
}),
//根据条件获取分类类容
router.get("/getCategoryContent",async ctx=>{
    console.log("根据条件获取分类类容");
    let {categoryNameId} = ctx.request.body;
    let data=null;
    if(categoryNameId){
        data = await query(
        "select * from categorycontent where category_name_id=? order by create_time desc",[categoryNameId]
        );
    }else{
        data = await query(
            "select * from categorycontent order by create_time desc",
            );
    }
    ctx.body = {
        data,
        code:0,
        message:"查询成功"
    }
}),

router.post('/login',async ctx=>{

    console.log('api登陆')
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
}),


app.use(router.routes());
app.listen(8888,()=>{
    console.log('启动album-api,监听8888端口')
});
