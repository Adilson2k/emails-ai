import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

export interface EmailAnalysis {
  importance: 'alta' | 'média' | 'baixa';
  summary: string;
  confidence: number;
  keywords: string[];
}

/**
 * Função auxiliar para pausar a execução
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!config.gemini.apiKey || config.gemini.apiKey === 'sua_chave_api') {
      console.warn('⚠️ GEMINI_API_KEY não configurada - IA desabilitada');
      this.genAI = null as any;
      this.model = null as any;
    } else {
      this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
  }

  /**
   * Analisa o conteúdo de um email e determina sua importância com retry logic
   */
  async analyzeEmail(subject: string, content: string, from: string): Promise<EmailAnalysis> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        if (!this.model) {
          console.warn('⚠️ Gemini não configurado - retornando análise padrão');
          return {
            importance: 'média',
            summary: 'Email recebido - análise de IA não disponível',
            confidence: 0,
            keywords: []
          };
        }

        const prompt = this.buildPrompt(subject, content, from);
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return this.parseResponse(text);
      } catch (error: any) {
        retryCount++;
        
        // Verifica se é erro 429 (Too Many Requests)
        const isRateLimitError = error.status === 429 || 
                                  error.message?.includes('429') ||
                                  error.message?.includes('quota') ||
                                  error.message?.includes('rate limit');
        
        if (isRateLimitError && retryCount < maxRetries) {
          // Extrai o retryDelay dos detalhes do erro
          const retryDelay = this.extractRetryDelay(error, retryCount);
          
          console.warn(`⚠️ Rate limit atingido (429). Tentativa ${retryCount}/${maxRetries}`);
          console.log(`⏳ Aguardando ${retryDelay}ms antes de tentar novamente...`);
          
          await sleep(retryDelay);
          continue;
        }
        
        // Se falhou 3 vezes ou não é erro de rate limit
        if (retryCount >= maxRetries) {
          console.error(`❌ Falha na análise do email após ${maxRetries} tentativas:`, error);
          throw new Error('Falha na análise do email após múltiplas tentativas');
        }
        
        console.error('Erro ao analisar email com Gemini:', error);
        throw new Error('Falha na análise do email');
      }
    }
    
    // Caso não deveria chegar aqui, mas retorna análise padrão
    return {
      importance: 'média',
      summary: 'Email recebido - análise falhou',
      confidence: 0,
      keywords: []
    };
  }

  /**
 * Extrai o tempo de atraso sugerido pelos detalhes do erro
 */
private extractRetryDelay(error: any, retryCount: number): number {
  // 1. Tenta extrair retryDelay do objeto RetryInfo dentro de errorDetails (Formato Gemini 429)
  const retryInfo = error.errorDetails?.find(
      (detail: any) => detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
  );

  if (retryInfo && retryInfo.retryDelay) {
      console.log(`[RetryInfo] Delay sugerido pela API: ${retryInfo.retryDelay}`);
      return this.parseDelay(retryInfo.retryDelay);
  }
  
  // Antiga tentativa de extrair de error.errorDetails.retryDelay (remover se não for necessário)
  if (error.errorDetails?.retryDelay) {
    const retryDelay = error.errorDetails.retryDelay;
    return this.parseDelay(retryDelay);
  }

  // 2. Procura retryDelay na mensagem (fallback, menos confiável)
  if (error.message) {
    const delayMatch = error.message.match(/retry in\s*(\d+(\.\d+)?[smh]?)\./i);
    if (delayMatch && delayMatch[1]) {
      console.log(`[Message Match] Delay sugerido na mensagem: ${delayMatch[1]}`);
      return this.parseDelay(delayMatch[1]);
    }
  }
  
  // Se não for encontrado o atraso da API, usamos a lógica de backoff exponencial
  console.log(`[Backoff] Não encontrado delay da API. Usando backoff exponencial na tentativa ${retryCount}.`);

  // Backoff exponencial: 1s, 2s, 4s, 8s, ... (sempre no mínimo 6s para 10 RPM)
  const baseDelay = 6000; // 6 segundos é o mínimo para 10 RPM (60s / 10 = 6s)
  const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
  
  // Limita a um valor seguro (ex: 30 segundos)
  return Math.min(exponentialDelay, 30000);
}

  /**
   * Converte um delay de string (ex: '13s', '2m') para milissegundos
   */
  private parseDelay(delay: string | number): number {
    // Se já for número, assume milissegundos
    if (typeof delay === 'number') {
      return delay;
    }
    
    // Remove espaços e converte para minúsculas
    const cleanDelay = delay.trim().toLowerCase();
    
    // Extrai número e unidade (s, m, h, d)
    const match = cleanDelay.match(/^(\d+)([smhd]?)$/);
    if (!match) {
      // Se não conseguir parsear, assume que é segundos
      const numericValue = parseInt(cleanDelay, 10);
      return isNaN(numericValue) ? 0 : numericValue * 1000;
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    // Converte para milissegundos baseado na unidade
    switch (unit) {
      case 's': // segundos
        return value * 1000;
      case 'm': // minutos
        return value * 60 * 1000;
      case 'h': // horas
        return value * 60 * 60 * 1000;
      case 'd': // dias
        return value * 24 * 60 * 60 * 1000;
      default: // sem unidade, assume segundos
        return value * 1000;
    }
  }

  /**
   * Constrói o prompt para análise do email
   */
  private buildPrompt(subject: string, content: string, from: string): string {
    return `
Analise o seguinte email e forneça uma resposta em formato JSON:

ASSUNTO: ${subject}
REMETENTE: ${from}
CONTEÚDO: ${content.substring(0, 2000)}...

INSTRUÇÕES:
1. Classifique a importância como: "alta", "média" ou "baixa"
2. Crie um resumo de até 200 caracteres
3. Determine a confiança da análise (0-100)
4. Extraia palavras-chave importantes

CRITÉRIOS PARA IMPORTÂNCIA ALTA:
- Propostas de negócios ou oportunidades comerciais
- Convites para reuniões importantes
- Ofertas de trabalho ou parcerias
- Assuntos urgentes ou críticos
- Comunicações de clientes importantes

RESPONDA APENAS COM JSON NO SEGUINTE FORMATO:
{
  "importance": "alta|média|baixa",
  "summary": "resumo do email",
  "confidence": 85,
  "keywords": ["palavra1", "palavra2", "palavra3"]
}
`;
  }

  /**
   * Parseia a resposta do Gemini para o formato esperado
   */
  private parseResponse(response: string): EmailAnalysis {
    try {
      // Remove possíveis markdown ou texto extra
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta inválida do Gemini');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validação dos campos obrigatórios
      if (!parsed.importance || !['alta', 'média', 'baixa'].includes(parsed.importance)) {
        throw new Error('Importância inválida');
      }
      
      if (!parsed.summary || typeof parsed.summary !== 'string') {
        throw new Error('Resumo inválido');
      }
      
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
        parsed.confidence = 50; // Valor padrão
      }
      
      if (!Array.isArray(parsed.keywords)) {
        parsed.keywords = [];
      }
      
      return {
        importance: parsed.importance,
        summary: parsed.summary.substring(0, 200), // Limita a 200 caracteres
        confidence: parsed.confidence,
        keywords: parsed.keywords.slice(0, 10) // Máximo 10 palavras-chave
      };
    } catch (error) {
      console.error('Erro ao parsear resposta do Gemini:', error);
      // Retorna análise padrão em caso de erro
      return {
        importance: 'média',
        summary: 'Email recebido - análise não disponível',
        confidence: 0,
        keywords: []
      };
    }
  }

  /**
   * Testa a conexão com a API do Gemini
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.model) {
        return false;
      }
      const result = await this.model.generateContent('Teste de conexão');
      await result.response;
      return true;
    } catch (error) {
      console.error('Erro ao testar conexão com Gemini:', error);
      return false;
    }
  }
}

export default GeminiService;
