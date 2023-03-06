import express from 'express';
//Back-and
import BuscaController from './controllers/BuscaController.js'
import EstabelecimentoController from './controllers/EstabelecimentoController.js';
import ProdutoController from './controllers/ProdutoController.js';
import LoginController from './controllers/LoginController.js';
import ImagesController from './controllers/ImageController.js';
import RecuperarSenhaController from './controllers/RecuperarSenhaController.js';
import UsuarioController from './controllers/UsuarioController.js';
import CategoriaController from './controllers/CategoriaController.js';

//Pagarme
// import CriarAssinaturaCreditoController from './pagarmeControllers/CriarAssinaturaCreditoController.js';
// import AlterarPlanoCreditoController from './pagarmeControllers/AlterarPlanoCreditoController.js';
import AlterarPlanoController from './pagarmeControllers/AlterarPlanoController.js';
import CancelarAssinaturaController from './pagarmeControllers/CancelarAssinaturaController.js';
import ConsultarAssinaturaController from './pagarmeControllers/ConsultarAssinaturaController.js';
import AtualizarInfoCartaoCreditoController from './pagarmeControllers/AtualizarInfoCartaoCreditoController.js';
import CriarAssinaturaController from './pagarmeControllers/CriarAssinaturaController.js';
import TrocaMetodoPagamentoParaBoletoController from './pagarmeControllers/TrocaMetodoPagamentoParaBoletoController.js';
import PostBackController from './pagarmeControllers/PostBackController.js';


import multerConfig from './config/multer.js';
import multerConfig_estabelecimento from './config/multer_estabelecimento.js';
import 'dotenv/config.js';



const routes = express.Router();
//Back-and
const estabelecimentoController = new EstabelecimentoController();
const buscaController = new BuscaController();
const produtoController = new ProdutoController();
const loginController = new LoginController();
const imagemController = new ImagesController();
const recuperarSenhaController= new RecuperarSenhaController();
const usuarioController = new UsuarioController();
const categoriaController = new CategoriaController();

//Pagarme
const criarAssinaturaController = new CriarAssinaturaController();
const postBackController = new PostBackController();
// const criarAssinaturaCreditoController = new CriarAssinaturaCreditoController();
const trocaMetodoPagamentoParaBoletoController = new TrocaMetodoPagamentoParaBoletoController();
const consultarAssinaturaController = new ConsultarAssinaturaController();
const cancelarAssinaturaController = new CancelarAssinaturaController();
const alterarPlanoController = new AlterarPlanoController();
// const alterarPlanoCreditoController = new AlterarPlanoCreditoController();
const atualizarInfoCartaoCreditoController = new AtualizarInfoCartaoCreditoController();


import jwt from 'jsonwebtoken';
import authConfig from './config/auth.js';
import multer from 'multer';




async function authToken(req, res, next) {
    const authHeader = req.headers.authorization;
    try {
        if (!authHeader) {
            return res.status(401).json({ error: 'no token provided' })
        }

        const parts = authHeader.split(' ');

        if (parts.length != 2) {
            return res.status(401).json({ error: 'token error' })
        }

        const [scheme, token] = parts;

        if (!/^Bearer/.test(scheme)) {
            return res.status(401).json({ error: 'token malformatted' })
        }

        jwt.verify(token, authConfig.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ mensagem: 'Seu tempo de sessão espirou, faca login novamente.', status: 'error',title: '', token_expired: true})
            }

            req.headers.userId = decoded.id;
            req.headers.estaId = decoded.esta_id;



        });
        return next();
    } catch (err) {
        return res.status(400).json({ error });
    }

};


// busca dos cardes de estabelecimentos 
routes.get('/busca', buscaController.index);

// envio do email
routes.post('/recuperarSenha',recuperarSenhaController.recuperarSenha);
// recebimento do novo senha
routes.post('/resetarSenha',recuperarSenhaController.resetarSenha);

routes.post('/validar/email',recuperarSenhaController.validarEmail);

// Rotas do processo de pagamento da pagarme
routes.post('/criar/assinatura/boleto',authToken, criarAssinaturaController.boleto);

routes.post('/criar/assinatura/credito',authToken, criarAssinaturaController.credito);

routes.post('/consultar/assinatura',authToken, consultarAssinaturaController.showDataBase);

routes.post('/cancelar/assinatura',authToken, cancelarAssinaturaController.showDataBase);

routes.post('/alterar/boleto',authToken, alterarPlanoController.boleto);

routes.post('/alterar/credito',authToken, alterarPlanoController.credito);

routes.post('/postback', postBackController.showDataBase)

routes.post('/atualizar/assinatura',authToken, atualizarInfoCartaoCreditoController.showDataBase);

routes.post('/alteracaoMetodoPagamento',authToken, trocaMetodoPagamentoParaBoletoController.showDataBase)



//Produto Controller
routes.put('/produto/:id',authToken, produtoController.update);
routes.put('/produto/image/:id',authToken,multer(multerConfig).single("files"), imagemController.itemUpdate);

routes.get('/produto',authToken, produtoController.index);

routes.post('/produto',authToken, produtoController.create);
routes.post('/produto/image/:id',authToken,multer(multerConfig).single("files"), imagemController.itemInsert);

routes.delete('/produto/:id',authToken, produtoController.delete);
routes.put('/itens/habilitado/:id',authToken,produtoController.habilitado);



routes.post('/login', loginController.login);

// Usuario Controller
routes.put('/usuario',authToken, usuarioController.update);
routes.put('/usuario/image',authToken,multer(multerConfig_estabelecimento).single("files"), imagemController.estabelecimentoUpdate);

routes.post('/usuario', usuarioController.create);
routes.post('/usuario/image/:id',multer(multerConfig_estabelecimento).single("files"), imagemController.estabelecimentoInsert);

routes.delete('/usuario',authToken, usuarioController.delete);
routes.get('/usuario',authToken, usuarioController.index);

routes.get('/estabelecimento/:id', estabelecimentoController.index);

routes.get('/categorias', categoriaController.index);



export default routes; 