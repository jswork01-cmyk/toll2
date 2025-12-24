
import { GoogleGenAI } from "@google/genai";
import { Transaction, Client } from '../types';

export const GeminiService = {
  analyzeBusiness: async (transactions: Transaction[], clients: Client[]): Promise<string> => {
    if (!process.env.API_KEY) {
      return "Gemini API 키가 설정되지 않았습니다. API 키를 환경 변수에 추가해주세요.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const salesData = transactions
        .filter(t => t.type === 'STATEMENT')
        .map(t => `${t.date}: ${t.clientName} - ${t.totalAmount.toLocaleString()}원 (${t.items.map(i => i.name).join(', ')})`)
        .join('\n');

      const clientNames = clients.map(c => c.name).join(', ');

      const prompt = `
        당신은 중소기업 경영 분석 전문가입니다. 아래는 '정심작업장'이라는 임가공 업체의 최근 매출 데이터입니다.
        이 데이터를 바탕으로 다음 내용을 포함한 간결한 경영 분석 보고서를 한국어로 작성해주세요:
        
        1. 전반적인 매출 추세 요약
        2. 주요 거래처 분석 및 의존도 평가
        3. 향후 매출 증대를 위한 제안 (임가공 업종 특성 고려)
        4. 데이터에서 발견된 특이사항 (긍정적/부정적)

        [거래처 목록]
        ${clientNames}

        [최근 매출 데이터]
        ${salesData}
        
        응답은 마크다운 형식으로 작성하고, 중요한 숫자는 볼드체로 강조해주세요.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || "분석 결과를 생성할 수 없습니다.";
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return "데이터 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }
  },

  generateEmailDraft: async (clientName: string, docType: string): Promise<string> => {
    if (!process.env.API_KEY) return "API 키가 필요합니다.";

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        '정심작업장'에서 거래처 '${clientName}' 담당자에게 보낼 이메일 초안을 작성해주세요.
        목적: ${docType} (견적서 또는 거래명세서) 송부
        톤앤매너: 정중하고 프로페셔널하게
        내용: 첨부파일 확인 요청, 지속적인 거래에 대한 감사 인사 포함.
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || "초안 생성 실패";
    } catch (e) {
      return "오류 발생";
    }
  }
};
