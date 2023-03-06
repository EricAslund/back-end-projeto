import express from 'express';

import db from '../database/connection.js';

export default class CategoriaController{
    async index(req,res){

        try{
            const categorias = await db('categoria_estabelecimento')

            return res.status(200).json(categorias);
        }catch(err){
            return res.status(500).json({message:err.message});
        }

    }
}