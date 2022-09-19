const express=require("express")
const multer=require("multer")
const route=require("./routes/route")
const mongoose=require("mongoose")
const app=express()

app.use(express.json())
app.use(multer().any())

mongoose.connect(
    "mongodb+srv://Parshant_rao:C4fIOvHGi74DVINv@newcluster.squkrr6.mongodb.net/InternGroup43",

    {
        useNewUrlParser:true 
    }
).then(()=>console.log("MongoDB is connected"))
    .catch((err)=>console.log(err))



app.use("/",route)

app.listen( process.env.PORT || 3000 , function(){
    console.log("Express is running on port " + (process.env.PORT || 3000))
})

