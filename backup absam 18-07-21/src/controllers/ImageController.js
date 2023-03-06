import express from 'express';
import 'dotenv/config.js';
import aws from 'aws-sdk';
const s3 = new aws.S3();

import db from '../database/connection.js';

export default class ImageController{
    async itemInsert(req,res){
        const { originalname: name, size, key, location: url = "" } = req.file;
        const itens_id = req.params.id

        try {
        await db('itens')
        .where('itens_id',itens_id)
        .update({ 
            foto_key: key,
            foto: url
        })
        return res.status(200).json({mensagem: '', status: 'success', title: 'Item cadastrado com sucesso!' })
    }catch(err){
        return res.status(400).json({ mensagem: '', status: 'error', title: ''});
    }

    }
    async itemUpdate(req,res){
        const { originalname: name, size, key, location: url = "" } = req.file;
        const itens_id = req.params.id

        try {
            const itens = await db('itens')
            .where('itens_id', itens_id)
        const iten = itens[0]


        var params = { Bucket: process.env.BUCKET_NAME_ITEM, Key: iten.foto_key };

        await s3.deleteObject(params, function (err, data) {
            if (err) { console.log(err, err.stack); }  // error

        });

        await db('itens')
        .where('itens_id',itens_id)
        .update({ 
            foto_key: key,
            foto: url
        })
        return res.status(200).json({mensagem: '', status: 'success', title: 'Item atualizado com sucesso!'})
    }catch(err){
        return res.status(400).json({ mensagem: '', status: 'error', title: ''});
    }

    }
    async estabelecimentoInsert(req,res){
        const { originalname: name, size, key, location: url = "" } = req.file;
        const estabelecimento_id = req.params.id;
        

        try {
        await db('estabelecimento')
        .where('estabelecimento_id',estabelecimento_id)
        .update({
            logo_key: key,
            logo_estabelecimento: url
        })
        return res.status(200).json({ mensagem: 'Verifique seu email para valida-lo.', status: 'success', title: 'Operação realizada com sucesso!'})
    }catch(err){
        console.log('deu erro')
        return res.status(400).json({ mensagem: '', status: 'error', title: ''})
    }
    }
    async estabelecimentoUpdate(req,res, next){
        const { originalname: name, size, key, location: url = "" } = req.file;
        const estabelecimento_id = req.headers.estaId;
        

        try {
            const estabelecimento = await db('estabelecimento').where('estabelecimento_id', estabelecimento_id)
            const estabelecimentoo = estabelecimento[0]
            

            var params_esta = { Bucket: process.env.BUCKET_NAME_ESTAB, Key: estabelecimentoo.logo_key };

            await s3.deleteObject(params_esta, function (err, data) {
                if (err) { console.log(err, err.stack); }  // error
            });

        await db('estabelecimento')
        .where('estabelecimento_id',estabelecimento_id)
        .update({
            logo_key: key,
            logo_estabelecimento: url
        })
        return res.status(200).json({mensagem: '', status: 'success', title: 'Dados atualizado!'})
    }catch(err){
        return res.status(400).json({ mensagem: '', status: 'error', title: ''})
        // next(err);
    }
    }
}