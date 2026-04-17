//src/services/people.service.ts
import { api } from '@/lib/axios';
import type {
  CreatePersonRequest,
  PeopleListResponse,
  Person,
  PersonDocumentOcrRequest,
  PersonDocumentOcrSuggestionResponse,
  UpdatePersonRequest,
  UpdatePersonStatusRequest,
} from '@/types/person';
import type { UnitResidentOption } from '@/types/resident';

type GetPeopleParams = {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
};

export async function getPeople(params?: GetPeopleParams): Promise<PeopleListResponse> {
  const normalizedParams = {
    ...params,
    limit:
      params?.limit === undefined
        ? undefined
        : Math.min(Math.max(params.limit, 1), 100),
  };

  const response = await api.get<PeopleListResponse>('/people', {
    params: normalizedParams,
  });
  return response.data;
}

export async function getAllPeople(params?: Omit<GetPeopleParams, 'page'>): Promise<PeopleListResponse> {
  const firstPage = await getPeople({ ...params, page: 1, limit: params?.limit ?? 100 });
  const totalPages = firstPage.meta?.totalPages ?? 1;

  if (totalPages <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      getPeople({ ...params, page: index + 2, limit: params?.limit ?? firstPage.meta?.itemsPerPage ?? 100 })
    )
  );

  const peopleById = new Map<string, Person>();

  for (const person of firstPage.data) {
    peopleById.set(person.id, person);
  }

  for (const page of remainingPages) {
    for (const person of page.data) {
      peopleById.set(person.id, person);
    }
  }

  return {
    data: Array.from(peopleById.values()),
    meta: {
      totalItems: peopleById.size,
      currentPage: 1,
      totalPages,
      itemsPerPage: firstPage.meta?.itemsPerPage ?? params?.limit ?? 100,
    },
  };
}

export async function getPersonById(id: string): Promise<Person> {
  const response = await api.get<Person>(`/people/${id}`);
  return response.data;
}

export async function getPersonByCpf(cpf: string): Promise<Person> {
  const response = await api.get<Person>('/people/by-cpf', {
    params: { cpf },
  });
  return response.data;
}

export async function getUnitResidents(unitId: string): Promise<UnitResidentOption[]> {
  const response = await api.get<UnitResidentOption[]>('/people/unit-residents', {
    params: { unitId },
  });
  return Array.isArray(response.data) ? response.data : [];
}

export async function suggestPersonDocumentData(payload: PersonDocumentOcrRequest): Promise<PersonDocumentOcrSuggestionResponse> {
  const response = await api.post<PersonDocumentOcrSuggestionResponse>('/people/document-ocr', payload);
  return response.data;
}

export async function createPerson(payload: CreatePersonRequest): Promise<Person> {
  const response = await api.post<Person>('/people', payload);
  return response.data;
}

export async function updatePerson(id: string, payload: UpdatePersonRequest): Promise<Person> {
  const response = await api.put<Person>(`/people/${id}`, payload);
  return response.data;
}

export async function updatePersonStatus(id: string, payload: UpdatePersonStatusRequest): Promise<Person> {
  const response = await api.patch<Person>(`/people/${id}/status`, payload);
  return response.data;
}

export async function uploadPersonPhoto(photoBase64: string, fileName?: string | null) {
  const response = await api.post<{ photoUrl: string }>('/people/photo/upload', {
    photoBase64,
    fileName: fileName ?? null,
  });

  return response.data;
}

export async function syncPersonFace(id: string): Promise<void> {
  await api.post(`/integrations/face/people/${id}/sync`);
}
