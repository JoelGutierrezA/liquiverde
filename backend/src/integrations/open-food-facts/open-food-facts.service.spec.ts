import { BadGatewayException, GatewayTimeoutException, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OpenFoodFactsService } from './open-food-facts.service';

const makeResponse = ({
  ok = true,
  status = 200,
  body,
  jsonError,
}: {
  ok?: boolean;
  status?: number;
  body?: unknown;
  jsonError?: Error;
}): Response =>
  ({
    ok,
    status,
    json: jest.fn().mockImplementation(() => {
      if (jsonError) {
        return Promise.reject(jsonError);
      }

      return Promise.resolve(body);
    }),
  }) as unknown as Response;

describe('OpenFoodFactsService', () => {
  let service: OpenFoodFactsService;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenFoodFactsService],
    }).compile();

    service = module.get<OpenFoodFactsService>(OpenFoodFactsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes a valid external response', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        body: {
          code: '3017620422003',
          status: 1,
          product: {
            product_name: ' Nutella ',
            brands: ' Ferrero ',
            image_front_url: ' https://images.openfoodfacts.org/nutella.jpg ',
          },
        },
      }),
    );

    await expect(service.findByBarcode('3017620422003')).resolves.toEqual({
      barcode: '3017620422003',
      name: 'Nutella',
      brand: 'Ferrero',
      category: 'unknown',
      description: null,
      imageUrl: 'https://images.openfoodfacts.org/nutella.jpg',
      price: null,
      carbonKg: null,
      localProduct: null,
      recyclablePackaging: null,
      fairTrade: null,
      socialScore: null,
      source: 'open_food_facts',
      store: null,
    });

    const [requestUrl, requestOptions] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(requestUrl.pathname).toBe('/api/v2/product/3017620422003');
    expect(requestUrl.searchParams.get('fields')).toBe('code,product_name,brands,image_front_url');
    expect(requestOptions.headers).toEqual({
      'User-Agent': 'LiquiVerde/1.0 (technical-challenge)',
    });
    expect(requestOptions.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns null when Open Food Facts reports product not found', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        body: {
          code: '9876543210987',
          status: 0,
        },
      }),
    );

    await expect(service.findByBarcode('9876543210987')).resolves.toBeNull();
  });

  it('returns null when Open Food Facts responds with HTTP 404', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        ok: false,
        status: 404,
      }),
    );

    await expect(service.findByBarcode('9876543210987')).resolves.toBeNull();
  });

  it('throws GatewayTimeoutException on timeout', async () => {
    fetchMock.mockRejectedValue(new DOMException('Request timed out', 'TimeoutError'));

    await expect(service.findByBarcode('3017620422003')).rejects.toBeInstanceOf(GatewayTimeoutException);
  });

  it('throws BadGatewayException on external HTTP errors', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        ok: false,
        status: 500,
      }),
    );

    await expect(service.findByBarcode('3017620422003')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('throws BadGatewayException on network errors', async () => {
    fetchMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

    await expect(service.findByBarcode('3017620422003')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('throws BadGatewayException on malformed JSON', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        jsonError: new SyntaxError('Unexpected token'),
      }),
    );

    await expect(service.findByBarcode('3017620422003')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('throws BadGatewayException on unexpected response shape', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        body: {
          code: '3017620422003',
          status: 1,
        },
      }),
    );

    await expect(service.findByBarcode('3017620422003')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('tolerates missing optional product fields', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        body: {
          code: '3017620422003',
          status: 1,
          product: {},
        },
      }),
    );

    await expect(service.findByBarcode('3017620422003')).resolves.toEqual(
      expect.objectContaining({
        name: 'Unknown product',
        brand: null,
        description: null,
        imageUrl: null,
        price: null,
        carbonKg: null,
        socialScore: null,
        store: null,
      }),
    );
  });
});
