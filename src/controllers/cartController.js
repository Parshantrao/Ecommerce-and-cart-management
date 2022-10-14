const {default: mongoose } = require("mongoose")
const {cartModel,userModel,productModel}=require("../models")

const {redis,validator,aws}=require("../utils")

const createCart = async function(req,res){
    try{

        const userId = req.params.userId

        if(!validator.isValidObjectId(userId)){
            return res.status(400).send({status:false, message:"Invalid userId"})
        }
        if(req.userId!=userId){
            return res.status(403).send({status:false, message:"unauthorization"})
        }
        const user = await userModel.findById(userId)
        if(!user){
            return res.status(400).send({status:false, message:"no user found"})
        }

        if(!validator.isValidObject(req.body)){
            return res.status(400).send({status:false, message:"pls provide data to create cart"}) 
        }
        let {cartId,productId}=req.body

        
        if(!productId){
            return res.status(400).send({status:false, message:"productId is mandatory"})
        }
        if(!validator.isValidObjectId(productId)){
            return res.status(400).send({status:false, message:"Invalid productId"})
        }

        const product = await productModel.findOne({_id:productId,isDeleted:false}).lean()
        if(!product){
            return res.status(400).send({status:false, message:"No product found"})
        }
        const cart = await cartModel.findOne({userId}).lean()
        if(cart){
            if(!cartId){
                return res.status(400).send({status:false, message:"cartId is mandatory"})
            }
            if(!validator.isValidObjectId(cartId)){
                return res.status(400).send({status:false, message:"Invalid cartId"})
            }

            let {items,totalItems,totalPrice}=cart
            let flag = true
            for(let i=0;i<items.length;i++){
                if(items[i].productId==productId){
                    flag=false
                    items[i].quantity=items[i].quantity++
                }
            }
            if(flag){
                let obj={
                    productId:mongoose.Types.ObjectId(productId),
                    quantity:1
                }
                items.push(obj)
            }
            totalPrice=totalPrice+product.price
            totalItems=items.length
            
            const updatedCart = await cartModel.findByIdAndUpdate(cartId,{items,totalPrice,totalItems},{new:true})
            return res.status(201).send({status:true, message:"Success", data:updatedCart})
        }
        else{
            let obj={}
            obj.userId = mongoose.Types.ObjectId(userId)
            obj.items= [{
                productId:mongoose.Types.ObjectId(productId),
                quantity:1
            }]
            obj.totalItems=1
            obj.totalPrice=product.price

            const newCart = await cartModel.create(obj)
            return res.status(201).send({status:true, message:"Success", data:newCart})
        }
    }
    catch(err){
        return res.status(500).send({status:false, message:err.message})
    }
}

const updateCart = async function(req,res){
    try{
        const userId = req.params.userId

        if(!validator.isValidObjectId(userId)){
            return res.status(400).send({status:false, message:"Invalid userId"})
        }
        if(req.userId!=userId){
            return res.status(403).send({status:false, message:"unauthorized"})
        }
        const user = await userModel.findById(userId)
        if(!user){
            return res.status(400).send({status:false, message:"no user found"})
        }

        const {cartId,productId,removeProduct}=req.body

        const mandField =["cartId","productId","removeProduct"]
        for(let key of mandField){
            if(!validator.isValid(req.body[key])){
                return res.status(400).send({status:false, message:`${key} is required`})
            }
        }

        const idS = ["cartId","productId"]
        for(let key of idS){
            if(!validator.isValidObjectId(req.body[key])){
                return res.status(400).send({status:false, message:`Invalid ${key}`})
            }
        }

        const product = await productModel.findOne({_id:productId, isDeleted:false})
        if(!product){
            return res.status(400).send({status:false, message:`no product found`})
        }

        const cart = await cartModel.findById(cartId)
        if(!cart){
            return res.status(400).send({status:false, message:"no cart found"})
        }

        if(removeProduct==0){
            const items = cart.items
            const flag = true
            for(let i=0;i<items.length;i++){
                
                if(items[i].productId==mongoose.Types.ObjectId(productId)){
                    flag =false
                    items.splice(i,i+1)
                }
            }
            if(flag){
                return res.status(400).send({status:false, message:"this product was not added in cart"})
            }
            const updatedCart = await cartModel.findByIdAndUpdate(cartId,{$set:{items}},{new:true})
            return res.status(200).send({status:true, data:product})
        }

        else if (removeProduct==1){
            const items = cart.items
            const flag = true
            for(let i=0;i<items.length;i++){
                
                if(items[i].productId==mongoose.Types.ObjectId(productId)){
                    flag =false
                    items[i].quantity=items[i].quantity-1
                    if(items[i].quantity==0){
                        items.splice(i,i+1)
                    }
                }
            }
            if(flag){
                return res.status(400).send({status:false, message:"this product was not added in cart"})
            }
            const updatedCart = await cartModel.findByIdAndUpdate(cartId,{$set:{items}},{new:true})
            return res.status(200).send({status:true, data:product})
        }
    }
    catch(err){
        return res.status(500).send({status:false, message:err.message})
    }
}

const getCart = async function(req,res){
    try{
        const userId = req.params.userId
        if(!validator.isValidObjectId(userId)){
            return res.status(400).send({status:false, message:"Invalid userId"})
        }

        if(req.userId!=userId){
            return res.status(403).send({status:false, message:"unauthorization"})
        }

        const user = await userModel.findById(userId).lean()
        if(!user){
            return res.status(404).send({status:false, message:"no user found"})
        }

        const cart = await cartModel.findOne({userId}).lean()
        if(!cart){
            return res.status(404).send({status:false, message:"no cart found"})
        }

        let productId = []
        for(let i=0;i<cart.items.length;i++){
            let ID = cart.items[i].productId
            productId.push(ID)
        }

        const product = await productModel.find({_id:{$in:[...productId]}})

        return res.status(200).send({status:true, cart:cart, data:product})
    }
    catch(err){
        return res.status(500).send({status:false, message:err.message})
    }
}

const deleteCart = async function(req,res){
    try{
        const userId = req.params.userId
        if(!validator.isValidObjectId(userId)){
            return res.status(400).send({status:false, message:"Invalid userId"}) 
        }

        if(req.userId != userId){
            return res.status(403).send({status:false, message:"unauthorized"})
        }

        const user = await userModel.findById(userId)
        if(!user){
            return res.status(400).send({status:false, message:"No user found"}) 
        }

        const obj={
            itmes:[],
            totalItems:0,
            totalPrice:0
        }

        const cart = await cartModel.findOne({userId},{$set:obj},{new:true})
        if(!cart){
            return res.status(404).send({status:false, message:"no cart found"})
        }
        console.log(cart)
        return res.status(204).send({status:true, message:"cart deleted"})

    }
    catch(err){
        return res.status(500).send({status:false, message:err.message})
    }
}

module.exports={
    createCart,
    updateCart,
    getCart,
    deleteCart
}