import express from 'express';
import validaCNPJ from '../tools/ValidarCNPJ.js';
import isValidCPF from '../tools/ValidarCPF.js';
import bcrypt from 'bcrypt';
import tokenEmail from '../tools/tokenEmail.js';
import mailer from '../tools/mailer.js';
import 'dotenv/config.js';
import aws from 'aws-sdk';
const s3 = new aws.S3();



import db from '../database/connection.js';


export default class UsuarioController {

    async index(req, res, next) {
        const usuario_id = req.headers.userId;
        const estabelecimento_id = req.headers.estaId


        try {
            const perfilUsuario = await db('usuario')
                // .join('estabelecimento', 'usuario.usuario_id', '=', 'estabelecimento.usuario_id')
                .where('usuario.usuario_id', '=', usuario_id)
            // .select('usuario.*')

            const usuario = perfilUsuario[0]
            usuario.senha = undefined

            const estabelecimento = await db('estabelecimento')
                .leftJoin('categoria_estabelecimento', 'estabelecimento.id_categoria_estabelecimento', '=', 'categoria_estabelecimento.categoria_id')
                .where('estabelecimento.estabelecimento_id', estabelecimento_id)
                .select('estabelecimento.*', 'categoria_estabelecimento.*')

            const estabelecimentop = estabelecimento[0]

            const horario = await db('horario_funcionamento')
                .where('horario_funcionamento.estabelecimento_id', '=', estabelecimento_id)

            const apps = await db('app_entrega')
                .where('app_entrega.estabelecimento_id', '=', estabelecimento_id)

            const sociais = await db('rede_social_estabelecimento')
                .where('rede_social_estabelecimento.estabelecimento_id', '=', estabelecimento_id)


            return res.status(200).json({ estabelecimentop, horario, apps, sociais, usuario })
        } catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        const {
            nome,
            data_nascimento,
            cpf,
            celular_usuario,
            email = email.toLowerCase(),
            genero,
            versao_termo_assinado,
            senha,
            estabelecimento,
            categoria_estabelecimento,
            horario_funcionamento,
            app_entrega,
            rede_social_estabelecimento
        } = req.body


        const vCNPJ = validaCNPJ(estabelecimento.cnpj);
        const vCPF = isValidCPF(cpf);

        const emailUnico = await db('usuario').where('email', '=', email)

        const emailU = emailUnico[0];

        const { token, now } = tokenEmail();

        const trx = await db.transaction();

       
      

        try {

            const senhaCrypto = await bcrypt.hash(senha, 10)

            if ((!emailU) &&
                (
                    ((estabelecimento.tipo_entidade == "fisica") && vCPF) ||
                    ((estabelecimento.tipo_entidade == "juridica" || "mei") && vCNPJ && vCPF)
                )) {
                

                    const usuarioId = await trx('usuario').insert({
                        nome,
                        data_nascimento,
                        cpf,
                        celular_usuario,
                        email,
                        genero,
                        data_cadastro: new Date(),
                        token_expiracao: now,
                        versao_termo_assinado,
                        senha: senhaCrypto,
                        token,
                        email_validado: false
                    });

                    const usuario_id = usuarioId[0];

                    await trx('assinatura').insert({
                        usuario_id: usuario_id,
                        status_assinatura: 'waiting_activate',
                        data_processamento_pagamento: null,
                        metodo_pagamento_utilizado: null,
                        assinatura_id: null,
                        plano_id: null,
                        plano: null,
                        metodo_pagamento_plano: null,
                        transacao_id: null,
                        data_transacao: null,
                        cartao_gerado_id: null,
                        data_criacao_cartao: null,
                        nome_portador_cartao: null,
                        ultimos_digitos_cartao_criado: null,
                        valor_plano: null,
                        codigo_autorizacao: null,
                        nsu: null,
                        chave_referencia: null,
                        url_assinatura: null,
                        cliente_pargarme_id: null,
                        data_registro: null,
                        conta_bancaria_id: null,
                        link_boleto: null,
                        ultima_atualizacao: null,
                        ultima_acao: null,
                    })
                    let entrega = false;
                    if (app_entrega) {
                        entrega = true
                    } else {
                        entrega = false
                    }
                    const insertEstabelecimentoId = await trx('estabelecimento').insert({
                        responsavel_estabelecimento: estabelecimento.responsavel_estabelecimento,
                        razao_social: estabelecimento.razao_social,
                        nome_fantasia: estabelecimento.nome_fantasia,
                        cpf,
                        cnpj: estabelecimento.cnpj,
                        cep: estabelecimento.cep,
                        endereco: estabelecimento.endereco,
                        numero: estabelecimento.numero,
                        complemento: estabelecimento.complemento,
                        bairro: estabelecimento.bairro,
                        cidade: estabelecimento.cidade,
                        uf: estabelecimento.uf,
                        telefone_fixo_estabelecimento: estabelecimento.telefone_fixo_estabelecimento,
                        descricao_estabelecimento: estabelecimento.descricao_estabelecimento,
                        data_cadastro: new Date(),
                        tipo_atividade: estabelecimento.tipo_atividade,
                        usuario_id: usuario_id,
                        id_categoria_estabelecimento: categoria_estabelecimento.categoria_id,
                        tipo_entidade: estabelecimento.tipo_entidade,
                        entrega: entrega
                    })


                    const estabelecimento_id = insertEstabelecimentoId[0];

                    const horario_estabelecimento = horario_funcionamento.map(horarioItems => {
                        return {
                            dia_semana: horarioItems.dia_semana,
                            horario_inicio: horarioItems.horario_inicio,
                            horario_fim: horarioItems.horario_fim,
                            estabelecimento_id: estabelecimento_id
                        };
                    });

                    await trx('horario_funcionamento').insert(horario_estabelecimento);

                    const app_estabelecimento = app_entrega.map(appItems => {
                        return {
                            aplicativo: appItems.aplicativo,
                            link_app: appItems.link_app,
                            estabelecimento_id: estabelecimento_id
                        }
                    })

                    await trx('app_entrega').insert(app_estabelecimento);

                    const rede_social = rede_social_estabelecimento.map(redeSocialItems => {
                        return {
                            rede_social: redeSocialItems.rede_social,
                            link: redeSocialItems.link,
                            estabelecimento_id: estabelecimento_id
                        }
                    })

                    await trx('rede_social_estabelecimento').insert(rede_social);

                    await trx.commit();

                    await mailer.sendMail({
                        to: email,
                        from: 'sinermarket@sinermarket.com.br',
                        subject: 'Validacao de Email da sinermarket',
                        html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
                    
                    <head>
                        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                        <meta name="x-apple-disable-message-reformatting" />
                        <meta name="apple-mobile-web-app-capable" content="yes" />
                        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
                        <meta name="format-detection" content="telephone=no" />
                        <link rel="preconnect" href="https://fonts.gstatic.com">
                        <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c&display=swap" rel="stylesheet">
                        <title></title>
                        <style type="text/css">
                            /* Resets */
                            
                            .ReadMsgBody {
                                width: 100%;
                                background-color: #ebebeb;
                            }
                            
                            .ExternalClass {
                                width: 100%;
                                background-color: #ebebeb;
                            }
                            
                            .ExternalClass,
                            .ExternalClass p,
                            .ExternalClass span,
                            .ExternalClass font,
                            .ExternalClass td,
                            .ExternalClass div {
                                line-height: 100%;
                            }
                            
                            a[x-apple-data-detectors] {
                                color: inherit !important;
                                text-decoration: none !important;
                                font-size: inherit !important;
                                font-family: inherit !important;
                                font-weight: inherit !important;
                                line-height: inherit !important;
                            }
                            
                            body {
                                -webkit-text-size-adjust: none;
                                -ms-text-size-adjust: none;
                            }
                            
                            body {
                                margin: 0;
                                padding: 0;
                            }
                            
                            .yshortcuts a {
                                border-bottom: none !important;
                            }
                            
                            .rnb-del-min-width {
                                min-width: 0 !important;
                            }
                            /* Add new outlook css start */
                            
                            .templateContainer {
                                max-width: 590px !important;
                                width: auto !important;
                            }
                            /* Add new outlook css end */
                            /* Image width by default for 3 columns */
                            
                            img[class="rnb-col-3-img"] {
                                max-width: 170px;
                            }
                            /* Image width by default for 2 columns */
                            
                            img[class="rnb-col-2-img"] {
                                max-width: 264px;
                            }
                            /* Image width by default for 2 columns aside small size */
                            
                            img[class="rnb-col-2-img-side-xs"] {
                                max-width: 180px;
                            }
                            /* Image width by default for 2 columns aside big size */
                            
                            img[class="rnb-col-2-img-side-xl"] {
                                max-width: 350px;
                            }
                            /* Image width by default for 1 column */
                            
                            img[class="rnb-col-1-img"] {
                                max-width: 550px;
                            }
                            /* Image width by default for header */
                            
                            img[class="rnb-header-img"] {
                                max-width: 590px;
                            }
                            /* Ckeditor line-height spacing */
                            
                            .rnb-force-col p,
                            ul,
                            ol {
                                margin: 0px!important;
                            }
                            
                            .rnb-del-min-width p,
                            ul,
                            ol {
                                margin: 0px!important;
                            }
                            /* tmpl-2 preview */
                            
                            .rnb-tmpl-width {
                                width: 100%!important;
                            }
                            /* tmpl-11 preview */
                            
                            .rnb-social-width {
                                padding-right: 15px!important;
                            }
                            /* tmpl-11 preview */
                            
                            .rnb-social-align {
                                float: right!important;
                            }
                            /* Ul Li outlook extra spacing fix */
                            
                            li {
                                mso-margin-top-alt: 0;
                                mso-margin-bottom-alt: 0;
                            }
                            /* Outlook fix */
                            
                            table {
                                mso-table-lspace: 0pt;
                                mso-table-rspace: 0pt;
                            }
                            /* Outlook fix */
                            
                            table,
                            tr,
                            td {
                                border-collapse: collapse;
                            }
                            /* Outlook fix */
                            
                            p,
                            a,
                            li,
                            blockquote {
                                mso-line-height-rule: exactly;
                            }
                            /* Outlook fix */
                            
                            .msib-right-img {
                                mso-padding-alt: 0 !important;
                            }
                            
                            @media only screen and (min-width:590px) {
                                /* mac fix width */
                                .templateContainer {
                                    width: 590px !important;
                                }
                            }
                            
                            @media screen and (max-width: 360px) {
                                /* yahoo app fix width "tmpl-2 tmpl-10 tmpl-13" in android devices */
                                .rnb-yahoo-width {
                                    width: 360px !important;
                                }
                            }
                            
                            @media screen and (max-width: 380px) {
                                /* fix width and font size "tmpl-4 tmpl-6" in mobile preview */
                                .element-img-text {
                                    font-size: 24px !important;
                                }
                                .element-img-text2 {
                                    width: 230px !important;
                                }
                                .content-img-text-tmpl-6 {
                                    font-size: 24px !important;
                                }
                                .content-img-text2-tmpl-6 {
                                    width: 220px !important;
                                }
                            }
                            
                            @media screen and (max-width: 480px) {
                                td[class="rnb-container-padding"] {
                                    padding-left: 10px !important;
                                    padding-right: 10px !important;
                                }
                                /* force container nav to (horizontal) blocks */
                                td.rnb-force-nav {
                                    display: inherit;
                                }
                                /* fix text alignment "tmpl-11" in mobile preview */
                                .rnb-social-text-left {
                                    width: 100%;
                                    text-align: center;
                                    margin-bottom: 15px;
                                }
                                .rnb-social-text-right {
                                    width: 100%;
                                    text-align: center;
                                }
                            }
                            
                            @media only screen and (max-width: 600px) {
                                /* center the address &amp; social icons */
                                .rnb-text-center {
                                    text-align: center !important;
                                }
                                /* force container columns to (horizontal) blocks */
                                th.rnb-force-col {
                                    display: block;
                                    padding-right: 0 !important;
                                    padding-left: 0 !important;
                                    width: 100%;
                                }
                                table.rnb-container {
                                    width: 100% !important;
                                }
                                table.rnb-btn-col-content {
                                    width: 100% !important;
                                }
                                table.rnb-col-3 {
                                    /* unset table align="left/right" */
                                    float: none !important;
                                    width: 100% !important;
                                    /* change left/right padding and margins to top/bottom ones */
                                    margin-bottom: 10px;
                                    padding-bottom: 10px;
                                    /*border-bottom: 1px solid #eee;*/
                                }
                                table.rnb-last-col-3 {
                                    /* unset table align="left/right" */
                                    float: none !important;
                                    width: 100% !important;
                                }
                                table.rnb-col-2 {
                                    /* unset table align="left/right" */
                                    float: none !important;
                                    width: 100% !important;
                                    /* change left/right padding and margins to top/bottom ones */
                                    margin-bottom: 10px;
                                    padding-bottom: 10px;
                                    /*border-bottom: 1px solid #eee;*/
                                }
                                table.rnb-col-2-noborder-onright {
                                    /* unset table align="left/right" */
                                    float: none !important;
                                    width: 100% !important;
                                    /* change left/right padding and margins to top/bottom ones */
                                    margin-bottom: 10px;
                                    padding-bottom: 10px;
                                }
                                table.rnb-col-2-noborder-onleft {
                                    /* unset table align="left/right" */
                                    float: none !important;
                                    width: 100% !important;
                                    /* change left/right padding and margins to top/bottom ones */
                                    margin-top: 10px;
                                    padding-top: 10px;
                                }
                                table.rnb-last-col-2 {
                                    /* unset table align="left/right" */
                                    float: none !important;
                                    width: 100% !important;
                                }
                                table.rnb-col-1 {
                                    /* unset table align="left/right" */
                                    float: none !important;
                                    width: 100% !important;
                                }
                                img.rnb-col-3-img {
                                    /**max-width:none !important;**/
                                    width: 100% !important;
                                }
                                img.rnb-col-2-img {
                                    /**max-width:none !important;**/
                                    width: 100% !important;
                                }
                                img.rnb-col-2-img-side-xs {
                                    /**max-width:none !important;**/
                                    width: 100% !important;
                                }
                                img.rnb-col-2-img-side-xl {
                                    /**max-width:none !important;**/
                                    width: 100% !important;
                                }
                                img.rnb-col-1-img {
                                    /**max-width:none !important;**/
                                    width: 100% !important;
                                }
                                img.rnb-header-img {
                                    /**max-width:none !important;**/
                                    width: 100% !important;
                                    margin: 0 auto;
                                }
                                img.rnb-logo-img {
                                    /**max-width:none !important;**/
                                    width: 100% !important;
                                }
                                td.rnb-mbl-float-none {
                                    float: inherit !important;
                                }
                                .img-block-center {
                                    text-align: center !important;
                                }
                                .logo-img-center {
                                    float: inherit !important;
                                }
                                /* tmpl-11 preview */
                                .rnb-social-align {
                                    margin: 0 auto !important;
                                    float: inherit !important;
                                }
                                /* tmpl-11 preview */
                                .rnb-social-center {
                                    display: inline-block;
                                }
                                /* tmpl-11 preview */
                                .social-text-spacing {
                                    margin-bottom: 0px !important;
                                    padding-bottom: 0px !important;
                                }
                                /* tmpl-11 preview */
                                .social-text-spacing2 {
                                    padding-top: 15px !important;
                                }
                                /* UL bullet fixed in outlook */
                                ul {
                                    mso-special-format: bullet;
                                }
                            }
                        </style>
                        <!--[if gte mso 11]><style type="text/css">table{border-spacing: 0; }table td {border-collapse: separate;}</style><![endif]-->
                        <!--[if !mso]><!-->
                        <style type="text/css">
                            table {
                                border-spacing: 0;
                            }
                            
                            table td {
                                border-collapse: collapse;
                            }
                        </style>
                        <!--<![endif]-->
                        <!--[if gte mso 15]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
                        <!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
                    </head>
                    
                    <body>
                    
                        <table border="0" align="center" width="100%" cellpadding="0" cellspacing="0" class="main-template" bgcolor="#f9fafc" style="background-color: rgb(249, 250, 252);">
                    
                            <tbody>
                                <tr>
                                    <td align="center" valign="top">
                                        <!--[if gte mso 9]>
                                            <table align="center" border="0" cellspacing="0" cellpadding="0" width="590" style="width:590px;">
                                            <tr>
                                            <td align="center" valign="top" width="590" style="width:590px;">
                                            <![endif]-->
                                        <table border="0" cellpadding="0" cellspacing="0" width="590" class="templateContainer" style="max-width:590px!important; width: 590px;">
                                            <tbody>
                                                <tr>
                    
                                                    <td align="center" valign="top">
                    
                                                        <div style="background-color: rgb(255, 255, 255);">
                    
                                                            <!--[if mso]>
                                    <table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                                    <tr>
                                    <![endif]-->
                    
                                                            <!--[if mso]>
                                    <td valign="top" width="590" style="width:590px;">
                                    <![endif]-->
                                                            <table class="rnb-del-min-width" width="100%" cellpadding="0" border="0" cellspacing="0" style="min-width:100%; -webkit-backface-visibility: hidden; line-height: 10px;" name="Layout_7" id="Layout_7">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="rnb-del-min-width" valign="top" align="center" style="min-width: 590px;">
                                                                            <a href="#" name="Layout_7"></a>
                                                                            <table width="100%" class="rnb-container" cellpadding="0" border="0" bgcolor="#ffffff" align="center" cellspacing="0" style="background-color: rgb(255, 255, 255);">
                                                                                <tbody>
                                                                                    <tr>
                                                                                        <td valign="top" align="center">
                                                                                            <table cellspacing="0" cellpadding="0" border="0">
                                                                                                <tbody>
                                                                                                    <tr>
                                                                                                        <td>
                                                                                                            <div style="border-radius:1px; max-width:10rem !important;border-top:0px None #000;border-right:0px None #000;border-bottom:0px None #000;border-left:0px None #000;border-collapse: separate;border-radius: 1px;">
                                                                                                                <div><img ng-if="col.img.source != 'url'" border="0" hspace="0" vspace="0" class="rnb-header-img" alt="" style="display:block; float:left; border-radius: 1px; width: 10rem;"
                                                                                                                        src="https:/www.sinermarket.com.br/assets/img/logo-sinermarket.svg"></div>
                                                                                                                <div
                                                                                                                    style="clear:both;"></div>
                                                        </div>
                                                        </td>
                                                        </tr>
                                                        </tbody>
                                                        </table>
                    
                                                        </td>
                                                        </tr>
                                                        </tbody>
                                                        </table>
                                                        </td>
                                                        </tr>
                                                        </tbody>
                                                        </table>
                                                        <!--[if mso]>
                                    </td>
                                    <![endif]-->
                    
                                                        <!--[if mso]>
                                    </tr>
                                    </table>
                                    <![endif]-->
                    
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr>
                    
                                                    <td align="center" valign="top">
                    
                                                        <table class="rnb-del-min-width" width="100%" cellpadding="0" border="0" cellspacing="0" style="min-width:590px;" name="Layout_2195" id="Layout_2195">
                                                            <tbody>
                                                                <tr>
                                                                    <td class="rnb-del-min-width" valign="top" align="center" style="min-width:590px;">
                                                                        <a href="#" name="Layout_2195"></a>
                                                                        <table width="100%" cellpadding="0" border="0" height="38" cellspacing="0">
                                                                            <tbody>
                                                                                <tr>
                                                                                    
                                                                                    <td valign="top" height="38" style="padding-top: 1.5rem;">
                                                                                        <hr>
                                                                                    </td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                                <tr>
                    
                                                    <td align="center" valign="top">
                    
                                                        <div style="background-color: rgb(255, 255, 255); border-radius: 0px;">
                    
                                                            <!--[if mso]>
                                    <table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                                    <tr>
                                    <![endif]-->
                    
                                                            <!--[if mso]>
                                    <td valign="top" width="590" style="width:590px;">
                                    <![endif]-->
                                                            <table class="rnb-del-min-width" width="100%" cellpadding="0" border="0" cellspacing="0" style="min-width:100%;" name="Layout_9">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="rnb-del-min-width" align="center" valign="top">
                                                                            <a href="#" name="Layout_9"></a>
                                                                            <table width="100%" border="0" cellpadding="0" cellspacing="0" class="rnb-container" bgcolor="#ffffff" style="background-color: rgb(255, 255, 255); padding-left: 20px; padding-right: 20px; border-collapse: separate; border-radius: 0px; border-bottom: 0px none rgb(200, 200, 200);">
                    
                                                                                <tbody>
                                                                                    <tr>
                                                                                        <td height="20" style="font-size:1px; line-height:20px; mso-hide: all;">&nbsp;</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td valign="top" class="rnb-container-padding" align="left">
                    
                                                                                            <table width="100%" border="0" cellpadding="0" cellspacing="0" class="rnb-columns-container">
                                                                                                <tbody>
                                                                                                    <tr>
                                                                                                        <th class="rnb-force-col" style="text-align: left; font-weight: normal; padding-right: 0px;" valign="top">
                    
                                                                                                            <table border="0" valign="top" cellspacing="0" cellpadding="0" width="100%" align="left" class="rnb-col-1">
                    
                                                                                                                <tbody>
                                                                                                                    <tr>
                                                                                                                        <td style="font-size:14px; font-family: 'M PLUS Rounded 1c', sans-serif; color:#3c4858; text-align: center;">
                                                                                                                            <div style="font-weight: bold; font-size: 1rem;">Para finalizar o processo de cadastro, precisamos que valide seu e-mail.</div>
                    
                                                                                                                            <div>&nbsp;</div>
                    
                                                                                                                            <div>
                    
                                                                                                                                <div style="font-size: 1rem;">Copie o código abaixo e cole na página de validação, que pode ser acessada</div>
                                                                                                                                
                                                                                                                            </div>
                    
                                                                                                                            <div>&nbsp;</div>
                                                                                                                        </td>
                                                                                                                    </tr>
                                                                                                                </tbody>
                                                                                                            </table>
                    
                                                                                                        </th>
                                                                                                    </tr>
                                                                                                </tbody>
                                                                                            </table>
                                                                                        </td>
                                                                                    </tr>
                                                                                    
                                                                                </tbody>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                            <!--[if mso]>
                                    </td>
                                    <![endif]-->
                    
                                                            <!--[if mso]>
                                    </tr>
                                    </table>
                                    <![endif]-->
                    
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr>
                    
                                                    <td align="center" valign="top">
                    
                                                        <div style="background-color: rgb(255, 255, 255); border-radius: 15px;">
                    
                                                            <!--[if mso]>
                                    <table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                                    <tr>
                                    <![endif]-->
                    
                                                            <!--[if mso]>
                                    <td valign="top" width="590" style="width:590px;">
                                    <![endif]-->
                                                            <table class="rnb-del-min-width" width="100%" cellpadding="0" border="0" cellspacing="0" style="min-width:590px;" name="Layout_10" id="Layout_10">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="rnb-del-min-width" align="center" valign="top" style="min-width:590px;">
                                                                            <a href="#" name="Layout_10"></a>
                                                                            <table width="100%" border="0" cellpadding="0" cellspacing="0" class="mso-button-block rnb-container" style="background-color: rgb(255, 255, 255); border-radius: 15px; padding-left: 20px; padding-right: 20px; border-collapse: separate;">
                                                                                <tbody>
                                                                                    
                                                                                    <tr>
                                                                                        <td valign="top" class="rnb-container-padding" align="left">
                    
                                                                                            <table width="100%" border="0" cellpadding="0" cellspacing="0" class="rnb-columns-container">
                                                                                                <tbody>
                                                                                                    <tr>
                                                                                                        <th class="rnb-force-col" valign="top">
                    
                                                                                                            <table border="0" valign="top" cellspacing="0" cellpadding="0" width="550" align="center" class="rnb-col-1">
                    
                                                                                                                <tbody>
                                                                                                                    <tr>
                                                                                                                        <td valign="top">
                                                                                                                            <table cellpadding="0" border="0" align="center" cellspacing="0" class="rnb-btn-col-content" style="margin:auto; border-collapse: separate;">
                                                                                                                                <tbody>
                                                                                                                                    <tr>
                                                                                                                                        <td width="auto" valign="middle" align="center" height="40" style="font-family: 'M PLUS Rounded 1c', sans-serif; ">
                                                                                                                                            <div>
                                                                                                                                                <a style="padding: 0.5rem !important; background-color: snow !important; color: black !important; border-radius: 5px !important; border: 1px solid #515151 !important; box-shadow: 1px 1px 3px 1px #6d6d6d !important; font-family: 'M PLUS Rounded 1c', sans-serif !important; outline: 0 !important; font-weight: bold !important; text-decoration: none !important; margin: 2rem !important;"
                                                                                                                                                    href="https://www.sinermarket.com.br/html/verifica_email">Clicando aqui</a>
                                                                                                                                            </div>
                                                                                                                                        </td>
                                                                                                                                    </tr>
                                                                                                                                </tbody>
                                                                                                                            </table>
                                                                                                                        </td>
                                                                                                                    </tr>
                                                                                                                </tbody>
                                                                                                            </table>
                                                                                                        </th>
                                                                                                    </tr>
                                                                                                </tbody>
                                                                                            </table>
                                                                                        </td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td height="20" style="font-size:1px; line-height:20px; mso-hide: all; padding-top: 1.5rem;">&nbsp;</td>
                                                                                    </tr>
                                                                                </tbody>
                                                                            </table>
                    
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                            <!--[if mso]>
                                    </td>
                                    <![endif]-->
                    
                                                            <!--[if mso]>
                                    </tr>
                                    </table>
                                    <![endif]-->
                    
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr style="width: max-content;">
                    
                                                    <td align="center" valign="top">
                    
                                                        <div style=" border-radius: 0px;">
                    
                                                            <!--[if mso]>
                                    <table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;">
                                    <tr>
                                    <![endif]-->
                    
                                                            <!--[if mso]>
                                    <td valign="top" width="590" style="width:590px;">
                                    <![endif]-->
                                                            <table class="rnb-del-min-width" cellpadding="0" border="0" cellspacing="0" style="min-width:max-content;" name="Layout_5">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="rnb-del-min-width" align="center" valign="top">
                                                                            <a href="#" name="Layout_5"></a>
                                                                            <table border="0" cellpadding="0" cellspacing="0" class="rnb-container" style="width: max-content;  padding-left: 20px; padding-right: 20px; border-collapse: separate; border-radius: 0px; border-bottom: 0px none rgb(200, 200, 200);">
                    
                                                                                <tbody>
                                                                                    
                                                                                    <tr>
                                                                                        <td valign="top" class="rnb-container-padding" align="left">
                    
                                                                                            <table border="0" cellpadding="0" cellspacing="0" class="rnb-columns-container">
                                                                                                <tbody>
                                                                                                    <tr>
                                                                                                        <th class="rnb-force-col" style="text-align: left; font-weight: normal; padding-right: 0px;" valign="top">
                    
                                                                                                            <table border="0" valign="top" cellspacing="0" cellpadding="0" align="left" class="rnb-col-1">
                    
                                                                                                                <tbody>
                                                                                                                    <tr>
                                                                                                                        <td style="font-size:14px; font-family: 'M PLUS Rounded 1c', sans-serif; color:#3c4858;">
                                                                                                                            <div style="text-align: center;"><span style="color:#FFFFFF;"><span style="background-color: rgb(128, 0, 128); border-radius: 5px; font-size:1rem; padding: 1rem 2rem;"><strong>`+ token + `</strong></span></span>
                                                                                                                            </div>
                                                                                                                        </td>
                                                                                                                    </tr>
                                                                                                                </tbody>
                                                                                                            </table>
                    
                                                                                                        </th>
                                                                                                    </tr>
                                                                                                </tbody>
                                                                                            </table>
                                                                                        </td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td height="2" style="font-size:1px; line-height:2px; mso-hide: all;">&nbsp;</td>
                                                                                    </tr>
                                                                                </tbody>
                                                                            </table>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                            <!--[if mso]>
                                    </td>
                                    <![endif]-->
                    
                                                            <!--[if mso]>
                                    </tr>
                                    </table>
                                    <![endif]-->
                    
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr>
                    
                                                    <td align="center" valign="top">
                    
                                                        <table class="rnb-del-min-width" width="100%" cellpadding="0" border="0" cellspacing="0" style="min-width:590px;" name="Layout_3913" id="Layout_3913">
                                                            <tbody>
                                                                <tr>
                                                                    <td class="rnb-del-min-width" valign="top" align="center" style="min-width:590px;">
                                                                        <a href="#" name="Layout_3913"></a>
                                                                        <table width="100%" cellpadding="0" border="0" height="38" cellspacing="0">
                                                                            <tbody>
                                                                                <tr>
                                                                                    <td valign="top" height="38">
                                                                                        <img width="20" height="38" style="display:block; max-height:38px; max-width:20px;" alt="" src="http://4ti8l.img.af.d.sendibt2.com/im/2864819/15fd9f264001efa0668072cabf04073d203e1c628b776e87506daf3661b832d6.gif?e=NjjMpJgWt3196lL-jdx_80VS9KV5ttPuND2w-XmCwXS2Dn9ri9oITJTE4Qw8TfFN9eCemUDggNR73Or2WFbnAHjCXHL3N1Y0Jht2ex4sUxJl1Uu9NX9fZPCaw9dN1MldV3CDORk5drdfp1JCA3E_Xp4dbUxh5b4SQh-5a-lsPf7HU3U5ql1i1XVvx1h49ek_U3gOTcJnH-FzXhPzD5cAJZxwG7c1DAL5-NEhEQy1mz8">
                                                                                    </td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                                <tr>
                    
                                                    <td align="center" valign="top">
                    
                                                        <div style="background-color: rgb(248, 203, 0);">
                    
                                                            <table class="rnb-del-min-width rnb-tmpl-width" width="100%" cellpadding="0" border="0" cellspacing="0" style="min-width:590px;" name="Layout_13" id="Layout_13">
                                                                <tbody>
                                                                    <tr>
                                                                        <td class="rnb-del-min-width" align="center" valign="top" bgcolor="#F8CB00" style="min-width:590px; background-color: #F8CB00; text-align: center;">
                                                                            <a href="#" name="Layout_13"></a>
                                                                            <table width="590" class="rnb-container" cellpadding="0" border="0" align="center" cellspacing="0" bgcolor="#F8CB00" style="padding-right: 20px; padding-left: 20px; background-color: rgb(248, 203, 0);">
                                                                                <tbody>
                                                                                    <tr>
                                                                                        <td height="10" style="font-size:1px; line-height:1px; mso-hide: all;">&nbsp;</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td>
                                                                                            <div style="font-size:14px; color:#888888; font-weight:normal; text-align:center; font-family: 'M PLUS Rounded 1c', sans-serif;">
                                                                                                <div>
                                                                                                    <div><span style="color:#000000;">Sinermarket, uma solução Sinercon<br>
                    R. Batista de Oliveira, 470 - Centro, Juiz de Fora, MG</span></div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div style="display: block; text-align: center;">
                                                                                                <span style="font-size:14px; font-weight:normal; display: inline-block; text-align:center; font-family: 'M PLUS Rounded 1c', sans-serif;">
                                                                    </span>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td height="10" style="font-size:1px; line-height:1px; mso-hide: all;">&nbsp;</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td>
                    
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td height="10" style="font-size:1px; line-height:1px; mso-hide: all;">&nbsp;</td>
                                                                                    </tr>
                                                                                </tbody>
                                                                            </table>
                                                                            </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                    
                                                        </div>
                                                        </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <!--[if gte mso 9]>
                                            </td>
                                            </tr>
                                            </table>
                                            <![endif]-->
                                        </td>
                                </tr>
                            </tbody>
                        </table>
                    
                        <img width="1" height="1" src="https://cigeibj.r.bh.d.sendibt3.com/tr/op/MH4O4IV460m3E-RE8NXF8_FaxxHELocFCQO5QeA7s8_kw9SnjkDNCQALADgQdC9BIPZ1vwQxtptT3M8RILvcZGOstjyEen1Jxtek5exudosbwlV4s5bxJ9ClBL0SZWjlYYxupzpdHgICug" alt="" /></body>
                    
                    </html>`
                    }, (err) => {
                        if (err) {
                            return res.status(400).json({ mensagem: 'Erro ao enviar email para valide email', status: 'error', title: '' })
                        }
                    })
                    return res.status(201).json({ estabelecimento_id, mensagem: 'Verifique seu email para valida-lo.', status: 'success', title: '' });
            }
            if (emailU) {

                return res.status(400).json({ mensagem: 'Usuario ja existente com este email', status: 'error', title: '' });
            } else {


                return res.status(400).json({ mensagem: 'CPF ou CNPJ invalido', status: 'error', title: '' })
            }
        } catch (err) {
            await trx.rollback();
            //    return next(err);

            next(err);
        }
    }
    async delete(req, res, next) {
        const usuario_id = req.headers.userId;
        const estabelecimento_id = req.headers.estaId

        const trx = await db.transaction();

        const deleteEstabelecimentoId = await db('estabelecimento')
            .where('estabelecimento.estabelecimento_id', '=', estabelecimento_id)

        const { logo_key } = deleteEstabelecimentoId[0];

        const itens = await db('itens')
            .where('estabelecimento_id', estabelecimento_id)

        try {

            await trx('horario_funcionamento')
                .where('estabelecimento_id', '=', estabelecimento_id)
                .del()

            await trx('app_entrega')
                .where('estabelecimento_id', '=', estabelecimento_id)
                .del()

            await trx('rede_social_estabelecimento')
                .where('estabelecimento_id', '=', estabelecimento_id)
                .del()

            var index, len;

            for (index = 0, len = itens.length; index < len; ++index) {

                if(itens.foto_key[index]){
                var params = { Bucket: process.env.BUCKET_NAME_ITEM, Key: itens.foto_key[index] };

                await s3.deleteObject(params, function (err, data) {
                    if (err) { console.log(err, err.stack); }  // error

                });
            }
            }

            await trx('itens')
                .where('estabelecimento_id', '=', estabelecimento_id)
                .del()
                
                if(logo_key){

            var params_esta = { Bucket: process.env.BUCKET_NAME_ESTAB, Key: logo_key };

            await s3.deleteObject(params_esta, function (err, data) {
                if (err) { console.log(err, err.stack); }  // error

            });
        }

            await trx('estabelecimento')
                .where('usuario_id', '=', usuario_id)
                .del()

            await trx('assinatura')
                .where('usuario_id', '=', usuario_id)
                .del()

            await trx('usuario')
                .where('usuario_id', '=', usuario_id)
                .del()

            await trx.commit();

            return res.status(200).json({ mensagem: '', status: 'success', title: 'Conta deletada com sucesso!' });

        } catch (err) {
            await trx.rollback();

            next(err);
        }
    }
    async update(req, res, next) {
        const usuario_id = req.headers.userId;
        const estabelecimento_id = req.headers.estaId

        const {
            nome,
            data_nascimento,
            cpf,
            celular_usuario,
            genero,
            versao_termo_assinado,
            senha,
            estabelecimento,
            horario_funcionamento,
            app_entrega,
            rede_social_estabelecimento
        } = req.body


        const vCNPJ = validaCNPJ(estabelecimento.cnpj);
        const vCPF = isValidCPF(cpf);

        const trx = await db.transaction();

        try {
            if (((estabelecimento.tipo_entidade == "fisica") && vCPF) ||
                ((estabelecimento.tipo_entidade == "juridica" || "mei") && vCNPJ && vCPF)) {
                if (senha != '') {
                    const senhaCrypto = await bcrypt.hash(senha, 10)

                    await trx('usuario').update({
                        nome,
                        data_nascimento,
                        cpf,
                        celular_usuario,
                        genero,
                        versao_termo_assinado,
                        senha: senhaCrypto,
                    }).where('usuario_id ', '=', usuario_id);
                } else {
                    await trx('usuario').update({
                        nome,
                        data_nascimento,
                        cpf,
                        celular_usuario,
                        genero,
                        versao_termo_assinado,
                    }).where('usuario_id ', '=', usuario_id);
                }
                let entrega = false;
                if (app_entrega) {
                    entrega = true
                } else {
                    entrega = false
                }

                await trx('estabelecimento').update({
                    responsavel_estabelecimento: estabelecimento.responsavel_estabelecimento,
                    razao_social: estabelecimento.razao_social,
                    nome_fantasia: estabelecimento.nome_fantasia,
                    cpf: estabelecimento.cpf,
                    cnpj: estabelecimento.cnpj,
                    cep: estabelecimento.cep,
                    endereco: estabelecimento.endereco,
                    numero: estabelecimento.numero,
                    complemento: estabelecimento.complemento,
                    bairro: estabelecimento.bairro,
                    cidade: estabelecimento.cidade,
                    uf: estabelecimento.uf,
                    telefone_fixo_estabelecimento: estabelecimento.telefone_fixo_estabelecimento,
                    descricao_estabelecimento: estabelecimento.descricao_estabelecimento,
                    tipo_atividade: estabelecimento.tipo_atividade,
                    entrega: entrega

                }).where('estabelecimento_id', '=', estabelecimento_id);


                const horario_estabelecimento = horario_funcionamento.map(horarioItems => {
                    return {
                        dia_semana: horarioItems.dia_semana,
                        horario_inicio: horarioItems.horario_inicio,
                        horario_fim: horarioItems.horario_fim,
                        estabelecimento_id: estabelecimento_id,
                    };
                });

                await trx('horario_funcionamento')
                    .where('estabelecimento_id', '=', estabelecimento_id)
                    .del()

                await trx('horario_funcionamento').insert(horario_estabelecimento);

                const app_estabelecimento = app_entrega.map(appItems => {
                    return {
                        aplicativo: appItems.aplicativo,
                        link_app: appItems.link_app,
                        estabelecimento_id: estabelecimento_id
                    }
                })

                await trx('app_entrega')
                    .where('estabelecimento_id', '=', estabelecimento_id)
                    .del()

                await trx('app_entrega').insert(app_estabelecimento);


                const rede_social = rede_social_estabelecimento.map(redeSocialItems => {
                    return {
                        rede_social: redeSocialItems.rede_social,
                        link: redeSocialItems.link,
                        estabelecimento_id: estabelecimento_id
                    }
                })

                await trx('rede_social_estabelecimento')
                    .where('estabelecimento_id', '=', estabelecimento_id)
                    .del()

                await trx('rede_social_estabelecimento').insert(rede_social);

                await trx.commit();


                return res.status(201).json({ estabelecimento_id, mensagem: '', status: 'success', title: 'Dados atualizado!' })
            } else {
                return res.status(400).json({ mensagem: 'CPF ou CNPJ invalido', status: 'error', title: '' })
            }
        } catch (err) {
            await trx.rollback();

            return next(err);
        }
    }
}