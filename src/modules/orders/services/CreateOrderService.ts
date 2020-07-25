import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    if (products.length <= 0) {
      throw new AppError('Invalid quantity of the products');
    }

    const productsID = products.map(product => {
      return { id: product.id };
    });

    const findProducts = await this.productsRepository.findAllById(productsID);

    if (findProducts.length !== products.length) {
      throw new AppError('There are products with not found');
    }

    const productsWithValues = findProducts.map(product => {
      const quantity = products.find(p => p.id === product.id)?.quantity;

      if (quantity === undefined || product.quantity < quantity) {
        throw new AppError('Insufficient quantity of the product');
      }

      return {
        product_id: product.id,
        price: product.price,
        quantity,
      };
    });

    const order = this.ordersRepository.create({
      customer,
      products: productsWithValues,
    });

    await this.productsRepository.updateQuantity(
      productsWithValues.map(product => {
        return {
          id: product.product_id,
          quantity: product.quantity,
        };
      }),
    );

    return order;
  }
}

export default CreateOrderService;
