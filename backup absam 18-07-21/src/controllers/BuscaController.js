import express from 'express';

import db from '../database/connection.js';

export default class BuscaController {
    async index(req, res, next) {
        const filtros = req.query;
        let estabelecimentos = []

        try {
             estabelecimentos = await db('estabelecimento')
                .leftJoin('categoria_estabelecimento', 'estabelecimento.id_categoria_estabelecimento', '=', 'categoria_estabelecimento.categoria_id')
                .leftJoin('itens', 'estabelecimento.estabelecimento_id', '=', 'itens.estabelecimento_id')
                .leftJoin('assinatura', 'estabelecimento.usuario_id', '=', 'assinatura.usuario_id')
                .where((qb) => {
                    if (filtros.categoria)
                        qb.where('categoria_estabelecimento.categoria_id', '=', filtros.categoria)
                    if (filtros.uf)
                        qb.where('estabelecimento.uf', '=', filtros.uf)
                    if (filtros.cidade)
                        qb.where('estabelecimento.cidade', '=', filtros.cidade)
                    if (filtros.bairro)
                        qb.where('estabelecimento.bairro', '=', filtros.bairro)
                    if (filtros.atividade)
                        qb.where('estabelecimento.tipo_atividade', '=', filtros.atividade)
                    if (filtros.busca) {
                        qb.where(function () {
                            this.where('itens.nome', 'like', '%' + filtros.busca + '%')
                                .orWhere('itens.descricao', 'like', '%' + filtros.busca + '%')
                                .orWhere('itens.palavra_chave', 'like', '%' + filtros.busca + '%')
                        })
                        qb.where('itens.habilitado', '=', 'true')
                    }
                })
                .where(function () {
                    this.where('assinatura.status_assinatura', '=', 'paid')
                        .orWhere('assinatura.status_assinatura', '=','waiting_payment' )
                    })
                .select(['estabelecimento.*', 'categoria_estabelecimento.*'])
                .where(function () {
                    this.where('assinatura.plano_id', '=', 518607)
                        .orWhere('assinatura.plano_id', '=', 518893)})
                .orderByRaw('RAND()').distinct('estabelecimento.estabelecimento_id')

            const estaN = await estabelecimentos.map(c => c.estabelecimento_id)

            const estabelecimentos2 = await db('estabelecimento')
                .leftJoin('categoria_estabelecimento', 'estabelecimento.id_categoria_estabelecimento', '=', 'categoria_estabelecimento.categoria_id')
                .leftJoin('itens', 'estabelecimento.estabelecimento_id', '=', 'itens.estabelecimento_id')
                .leftJoin('assinatura', 'estabelecimento.usuario_id', '=', 'assinatura.usuario_id')
                .where((qb) => {
                    if (filtros.categoria)
                        qb.where('categoria_estabelecimento.categoria_id', '=', filtros.categoria)
                    if (filtros.uf)
                        qb.where('estabelecimento.uf', '=', filtros.uf)
                    if (filtros.cidade)
                        qb.where('estabelecimento.cidade', '=', filtros.cidade)
                    if (filtros.bairro)
                        qb.where('estabelecimento.bairro', '=', filtros.bairro)
                    if (filtros.atividade)
                        qb.where('estabelecimento.tipo_atividade', '=', filtros.atividade)
                    if (filtros.busca) {
                        qb.where(function () {
                            this.where('itens.nome', 'like', '%' + filtros.busca + '%')
                            .orWhere('itens.descricao', 'like', '%' + filtros.busca + '%')
                                .orWhere('itens.palavra_chave', 'like', '%' + filtros.busca + '%')
                        })
                        qb.where('itens.habilitado', '=', 'true')
                    }
                })
                .where(function () {
                    this.where('assinatura.status_assinatura', '=', 'paid')
                        .orWhere('assinatura.status_assinatura', '=','waiting_payment' )
                    })
                .select(['estabelecimento.*', 'categoria_estabelecimento.*'])
                .whereNotIn('estabelecimento.estabelecimento_id', estaN)
                .orderByRaw('RAND()').limit(40).distinct('estabelecimento.estabelecimento_id')

            estabelecimentos.push(...estabelecimentos2)
            


            const cidade = estabelecimentos.map(c => c.cidade).filter(((value, index, self) => self.indexOf(value) === index))


            const bairro = estabelecimentos.map(c => c.bairro).filter(((value, index, self) => self.indexOf(value) === index))

            const UF = await db('estabelecimento')
                .select('estabelecimento.uf')
                .distinct('estabelecimento.uf')

            if (!estabelecimentos) {
                return res.status(400).json({ message: 'Nenhum estabelecimento encontrado com esso parametros.' })
            }

            return res.json({ estabelecimentos, cidade, UF, bairro });
        } catch (err) {
            next(err);
        }
    }
}