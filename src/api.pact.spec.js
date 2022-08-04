import {Pact} from '@pact-foundation/pact';
import {API} from './api';
import {Matchers} from '@pact-foundation/pact';
import {Product} from './product';

const {eachLike, like, regex} = Matchers;

const mockProvider = new Pact({
    consumer: 'pactflow-example-consumer',
    provider: process.env.PACT_PROVIDER ? process.env.PACT_PROVIDER : 'pactflow-example-provider',
});

describe('API Pact test', () => {
    beforeAll(() => mockProvider.setup());
    afterEach(() => mockProvider.verify());
    afterAll(() => mockProvider.finalize());

    describe('retrieving a product', () => {
        test('ID 10 exists', async () => {
            // const expectedProduct = {id: '10', type: 'CREDIT_CARD', name: '28 Degrees'}

            // New field price introduced
            const expectedProduct = {id: '10', type: 'CREDIT_CARD', name: '28 Degrees'}

            await mockProvider.addInteraction({
                state: 'a product with ID 10 exists',
                uponReceiving: 'a request to get a product',
                withRequest: {
                    method: 'GET',
                    path: '/product/10',
                    headers: {
                        Authorization: like('Bearer 2019-01-14T11:34:18.045Z'),
                    },
                },
                willRespondWith: {
                    status: 200,
                    headers: {
                        'Content-Type': regex({
                            generate: 'application/json; charset=utf-8',
                            matcher: 'application/json;?.*'
                        }),
                    },
                    body: like(expectedProduct),
                },
            });

            // Act
            const api = new API(mockProvider.mockService.baseUrl);
            const product = await api.getProduct('10');

            // Assert - did we get the expected response
            expect(product).toStrictEqual(new Product(expectedProduct));
        });

        test('product does not exist', async () => {

            // set up Pact interactions
            await mockProvider.addInteraction({
                state: 'a product with ID 11 does not exist',
                uponReceiving: 'a request to get a product',
                withRequest: {
                    method: 'GET',
                    path: '/product/11',
                    headers: {
                        'Authorization': like('Bearer 2019-01-14T11:34:18.045Z')
                    }
                },
                willRespondWith: {
                    status: 404
                },
            });

            const api = new API(mockProvider.mockService.baseUrl);

            // make request to Pact mock server
            await expect(api.getProduct('11')).rejects.toThrow('Request failed with status code 404');
        });

        test('product is updated', async () => {
            const expectedProduct = {id: '10', type: 'CREDIT_CARD', name: '28 Degrees'}
            const requestBody = {
                type: 'LOAN_CARD',
                name: 'APPLE_I_CARD',
                version: 'v3',
                color: 'orange',
                price: 65.0
            }
            await mockProvider.addInteraction({
                state: 'a product with ID 10 exists',
                uponReceiving: 'a request to update a product',
                withRequest: {
                    method: 'POST',
                    path: '/product/10',
                    headers: {
                        Authorization: like('Bearer 2019-01-14T11:34:18.045Z'),
                    },
                    body: like(requestBody),
                },
                willRespondWith: {
                    status: 200,
                    headers: {
                        'Content-Type': regex({
                            generate: 'application/json; charset=utf-8',
                            matcher: 'application/json;?.*'
                        }),
                    },
                    body: like(expectedProduct),
                },
            });

            const api = new API(mockProvider.mockService.baseUrl);
            const product = await api.postProduct('10', requestBody);
        })
    });

    describe('retrieving products', () => {
        test('products exists', async () => {
            // set up Pact interactions
            const expectedProduct = {id: '10', type: 'CREDIT_CARD', name: '28 Degrees'}

            await mockProvider.addInteraction({
                state: 'products exist',
                uponReceiving: 'a request to get all products',
                withRequest: {
                    method: 'GET',
                    path: '/products',
                    headers: {
                        Authorization: like('Bearer 2019-01-14T11:34:18.045Z'),
                    },
                },
                willRespondWith: {
                    status: 200,
                    headers: {
                        'Content-Type': regex({
                            generate: 'application/json; charset=utf-8',
                            matcher: 'application/json;?.*'
                        }),
                    },
                    body: eachLike(expectedProduct),
                },
            });

            const api = new API(mockProvider.mockService.baseUrl);

            // make request to Pact mock server
            const products = await api.getAllProducts()

            // assert that we got the expected response
            expect(products).toStrictEqual([new Product(expectedProduct)]);
        });
    });
});
