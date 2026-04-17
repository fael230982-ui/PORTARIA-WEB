// src/services/incore.service.ts (web) | services/incore.ts (mobile)
import { api } from '@/lib/axios';

export const incoreService = {
  async detectFace(imageBase64: string, cameraId: string) {
    try {
      const res = await api.post('/vezha/detect', {
        image: imageBase64,
        cameraId,
        condominioId: 'condo-1'
      });
      return res.data; // { isAuthorized: true/false, personId, confidence }
    } catch (error) {
      console.error('IncoreSoft error:', error);
      return { isAuthorized: false, confidence: 0 };
    }
  },

  async registerPerson(personData: { name: string; faceImage: string }) {
    return api.post('/vezha/register', personData);
  }
};
