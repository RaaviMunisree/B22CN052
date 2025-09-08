const express=require('express');
exports.logs=async (req,res)=>{
    try{
       const {stack,level,package,message}=req.body();
       if(stack||level||package||message)
       {
        return res.status(400).json({message:"Every field is required"});
       }
       if(message.length()<5){
        return res.status(400).json({message:"Message length should be greater than 5"});
       }
       res.status(201).json({
       "logID": "66dc8629-45d4-42e9-8b67-66e42831d851",
       "message": "log created successfully"
       });
       
    }catch(error){
       res.status(500).json({message:"Internal server error"});
    }

}