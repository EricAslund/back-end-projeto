import express from 'express';


import db from '../database/connection.js';


// }


export default class EstabelecimentoController {

    async index(req, res,next) {
        const id = req.params.id;
    try {
        const estabelecimento = await db('estabelecimento')
            .leftJoin('categoria_estabelecimento', 'estabelecimento.id_categoria_estabelecimento', '=', 'categoria_estabelecimento.categoria_id')
            .where('estabelecimento.estabelecimento_id', '=', id)

        const horario = await db('horario_funcionamento')
            .where('horario_funcionamento.estabelecimento_id', '=', id)

        const apps = await db('app_entrega')
            .where('app_entrega.estabelecimento_id', '=', id)

        const sociais = await db('rede_social_estabelecimento')
            .where('rede_social_estabelecimento.estabelecimento_id', '=', id)

        const itens = await db('itens')
            .where('estabelecimento_id', '=', id)
            .where('habilitado','=','true')

        return res.status(200).json({estabelecimento, horario, apps, sociais, itens})
    } catch (err) {
       next(err);
    }
    }

   
}