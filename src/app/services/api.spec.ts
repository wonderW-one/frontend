import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),        // Fournit le client HTTP requis par le service
        provideHttpClientTesting() // Fournit le contrôleur de simulation (Mock)
      ]
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Vérifie qu'il n'y a aucune requête HTTP résiduelle non traitée
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- TEST DE LA CONNEXION (LOGIN) ---
  it('should perform login and return tokens', () => {
    const mockTokens = { access: 'access-token-123', refresh: 'refresh-token-123', user_id: 42 };
    const username = 'wonder1';
    const password = 'wonder123';

    service.login(username, password).subscribe(response => {
      expect(response).toEqual(mockTokens);
      expect(response.user_id).toBe(42);
    });

    // Intercepte l'appel attendu vers l'URL Django
    const req = httpMock.expectOne('http://127.0.0.1:8000/api/token/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username, password });

    // Envoie la fausse réponse (donnée simulée) au flux RxJS
    req.flush(mockTokens);
  });

  // --- TEST DE LA SÉCURITÉ DES EN-TÊTES (JWT BEARER) ---
  it('should include JWT Token in Authorization Header if present', () => {
    localStorage.setItem('access_token', 'my-secret-jwt');
    const mockProfile = { id: 42, role: 'CLIENT', telephone: '2376...' };

    service.getProfile(42).subscribe(profile => {
      expect(profile).toEqual(mockProfile);
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/clients/42/');
    expect(req.request.method).toBe('GET');
    
    // Validation stricte du format exigé par Django SimpleJWT
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-secret-jwt');

    req.flush(mockProfile);
  });
});