import express from 'express';

import 'dotenv/config.js';
import aws from 'aws-sdk';

import db from '../database/connection.js';

const s3 = new aws.S3();

export default class ProdutoController {

    async create(req, res, next) {
        const id = req.headers.userId;
        const estabelecimento_id =  req.headers.estaId

        const {
            nome,
            descricao,
            preco,
            palavra_chave,
            condicao,
            link_pagamento,
            tipo_item
        } = req.body;

        try {

            const Nproduto = await db('itens').where('itens.estabelecimento_id', '=', estabelecimento_id);
            
            const clientePlano = await db('assinatura').where('usuario_id', '=', id);
            const clientePlano1 = clientePlano[0]
            
            if(clientePlano1.status_assinatura == 'paid' || clientePlano1.status_assinatura ==  'waiting_payment' ){
              

                if (((clientePlano1.plano_id == 518604 || 518920) && Nproduto.length <= 4)
                && ((clientePlano1.plano_id == 518606 ||  518919) && Nproduto.length <= 9)
                && ((clientePlano1.plano_id == 518607 || 518893) && Nproduto.length <= 29)) {

                if (clientePlano1.plano_id == 518604 || clientePlano1.plano_id == 518920) {
                const itemdata = await db('itens').insert({


                    estabelecimento_id,
                    nome,
                    descricao,
                    preco,
                    palavra_chave,
                    condicao,
                    data_cadastro: new Date(),
                    habilitado:'true',
                    tipo_item
                })
    
              const item = itemdata[0]
    
                return res.status(201).json({item});

            } else {  

            const itemdata = await db('itens').insert({

                estabelecimento_id,
                nome,
                descricao,
                preco,
                palavra_chave,
                condicao,
                link_pagamento,
                data_cadastro: new Date(),
                habilitado:'true',
                tipo_item
            })

          const item = itemdata[0]

            return res.status(201).json({item});
        }
            }
            return res.status(400).json({mensagem:'Chego o limite de items',status: 'error', title: ''})
            
        }else{
        return res.status(400).json({mensagem:'Por favor escole um plano antes de cadastrar items',status: 'error', title: ''})
        }
        } catch (err) {
            next(err);
        }

    }

    async index(req, res, next) {
        const esta_id = req.headers.estaId;
        try {
            const itens = await db('itens')
                .where('itens.estabelecimento_id', '=', esta_id)

            return res.status(200).json(itens);
        } catch (err) {
            next(err);
        }
    }

    async update(req, res, next) {
        const itens_id = req.params.id;

        const {
            nome,
            descricao,
            preco,
            palavra_chave,
            condicao,
            link_pagamento,
            tipo_item
        } = req.body;

        try {
            await db('itens')
                .update({
                nome,
                descricao,
                preco,
                palavra_chave,
                condicao,
                link_pagamento,  
                tipo_item
                })
                .where('itens_id', '=' ,itens_id);
            return res.status(201).json({mensagem: '', status: 'success', title: 'Item atualizado com sucesso!'})
        } catch (err) {
            next(err);
        }
    }

    async delete(req, res, next) {
        const id = req.params.id;

        try {
            const itens = await db('itens')
                .where('itens_id', id)
            const item = itens[0]

if(itens.foto_key){
            var params = { Bucket: process.env.BUCKET_NAME_ITEM, Key: item.foto_key };

            await s3.deleteObject(params, function (err, data) {
                if (err) { console.log(err, err.stack); }  // error

            });
        }

            await db('itens').delete().where('itens_id', '=', id);

            return res.status(200).json({ mensagem: '', status: 'success', title: 'Item deletado com sucesso!' });
        } catch (err) {
            next(err);
        }

    }

    async habilitado(req, res, next) {
        const id = req.params.id;
        const disponivel = req.body.disponibilidade;

        try{
        await db('itens').where('itens_id', '=', id).update({'habilitado':disponivel})

            return res.status(200).json({ mensagem: 'success' ,status: '', title: 'Alterado com sucesso' });
        } catch (err) {
            return res.status(500).json({mensagem:'erro',status: '', title: '' })
        }
    }
}