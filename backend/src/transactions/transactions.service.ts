import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ErrorBuilder, ErrorMethod } from "src/app/common/utils/error.util";
import { BookStatus } from "src/books/enums/book-status.enum";
import { Book } from "src/books/schemas/book.schema";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { TransactionsType } from "./enums/transactions-type.enum";
import { Transaction } from "./schemas/transaction.schema";

const POPULATE_PIPE = [
  {
    path: "book",
    select: ["name.en", "bookImage", "category"],
    populate: {
      path: "category",
      select: "name.en",
    },
  },
  {
    path: "user",
    select: ["username"],
  },
];
@Injectable()
export class TransactionsService {
  private readonly errorBuilder = new ErrorBuilder("Transactions");

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    @InjectModel(Book.name)
    private readonly bookModel: Model<Book>
  ) {}

  async create(
    createTransactionDto: CreateTransactionDto
  ): Promise<Transaction> {
    // Check if the status is BORROW when creating a new transaction
    if (createTransactionDto.status !== TransactionsType.borrow) {
      throw new BadRequestException(
        "New transactions must have the status 'BORROW'."
      );
    }

    // Find the book by ID
    const book = await this.bookModel.findById(createTransactionDto.book);
    if (!book) {
      throw new NotFoundException(
        `Book with ID ${createTransactionDto.book} not found`
      );
    }

    // Check if the book's status is not "READY"
    if (book.status !== BookStatus.ready) {
      throw new ConflictException(
        `Book with ID ${createTransactionDto.book} is not ready for borrowing`
      );
    }

    // Adjust the book's quantity based on the transaction status
    if (createTransactionDto.status === TransactionsType.borrow) {
      if (book.quantity <= 0) {
        throw new ConflictException("Book is not available for borrowing");
      }
      // Decrease the quantity by 1
      book.quantity = (book.quantity || 0) - 1;
    } else if (createTransactionDto.status === TransactionsType.return) {
      // Increase the quantity by 1
      book.quantity = (book.quantity || 0) + 1;
    }

    // Save the updated book quantity
    const updatedBook = await book.save();
    console.log(`Updated book quantity: ${updatedBook.quantity}`);

    // Create the transaction
    const transactionDoc = new this.transactionModel(createTransactionDto);
    const transaction = await transactionDoc.save();

    return transaction.toObject();
  }

  async findAll(): Promise<Transaction[]> {
    const transaction = await this.transactionModel
      .find()
      .populate(POPULATE_PIPE)
      .lean();
    return transaction;
  }

  async findOne(id: string): Promise<Transaction> {
    try {
      const transaction = await this.transactionModel
        .findById(id)
        .populate(POPULATE_PIPE)
        .lean();
      if (!transaction) {
        throw new NotFoundException(
          this.errorBuilder.build(ErrorMethod.notFound, { id })
        );
      }
      return transaction;
    } catch (error) {
      throw error;
    }
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto
  ): Promise<Transaction> {
    // Validate returnDate based on status if status is included in updateTransactionDto
    if (
      updateTransactionDto.status === TransactionsType.borrow &&
      updateTransactionDto.returnDate
    ) {
      throw new ConflictException(
        "When status is BORROW, returnDate must not be provided."
      );
    }

    // Check if the status is being updated to RETURN, and ensure returnDate is provided
    if (
      updateTransactionDto.status === TransactionsType.return &&
      !updateTransactionDto.returnDate
    ) {
      throw new BadRequestException(
        "When status is RETURN, returnDate is required."
      );
    }

    const exists = await this.transactionModel.exists({ _id: id });
    if (!exists) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    // Get the current transaction
    const currentTransaction = await this.transactionModel.findById(id);
    if (!currentTransaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    // Check if the status is being updated to RETURN and if the book has not been returned yet
    if (
      updateTransactionDto.status === TransactionsType.return &&
      currentTransaction.status === TransactionsType.borrow
    ) {
      // Find the associated book
      const book = await this.bookModel.findById(currentTransaction.book);
      if (!book) {
        throw new NotFoundException(
          `Book with ID ${currentTransaction.book} not found`
        );
      }

      // Increase the book quantity
      book.quantity = (book.quantity || 0) + 1;
      await book.save();
    }

    try {
      const options = { new: true };
      const updatedTransaction = await this.transactionModel
        .findByIdAndUpdate(id, updateTransactionDto, options)
        .lean();

      return updatedTransaction;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(`Transaction update conflict`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Transaction> {
    const transaction = await this.transactionModel
      .findByIdAndDelete(id)
      .lean();
    if (!transaction) {
      throw new NotFoundException(
        this.errorBuilder.build(ErrorMethod.notFound, { id })
      );
    }
    return transaction;
  }
}
