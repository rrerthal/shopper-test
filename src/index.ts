import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));

// Endpoint para upload de imagem
app.post('/upload', async (req: Request, res: Response) => {
    try {
        const { image, customer_code, measure_datetime, measure_type } = req.body;

        if (!image || typeof image !== 'string' ||
            !customer_code || typeof customer_code !== 'string' ||
            !measure_datetime || typeof measure_datetime !== 'string' ||
            !measure_type || (measure_type !== 'WATER' && measure_type !== 'GAS')) {
            return res.status(400).json({
                error_code: 'INVALID_DATA',
                error_description: 'Dados fornecidos no corpo da requisição são inválidos',
            });
        }

        const geminiResponse = await axios.post(
            'https://gemini.googleapis.com/v1/text',
            {
                image: image,
                prompt: 'Extraia o valor numérico da medição nesta imagem.',
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
                },
            }
        );

        const measureValue = parseFloat(geminiResponse.data.text);

        const measureUuid = uuidv4();

        res.status(200).json({
            image_url: 'URL_TEMPORARIA_DA_IMAGEM',
            measure_value: measureValue,
            measure_uuid: measureUuid,
        });

    } catch (error) {
        console.error('Erro ao processar a imagem:', error);

        if (error.response && error.response.status === 409) {
            return res.status(409).json({
                error_code: 'DOUBLE_REPORT',
                error_description: 'Já existe uma leitura para este tipo no mês atual',
            });
        }

        res.status(500).json({
            error_code: 'INTERNAL_SERVER_ERROR',
            error_description: 'Erro interno do servidor',
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});