import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Participant, PaymentStatus } from './entities/participant.entity';
import { Split } from '../splits/entities/split.entity';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';

@Injectable()
export class ParticipantsService {
  constructor(
    @InjectRepository(Participant)
    private readonly participantRepository: Repository<Participant>,
    @InjectRepository(Split)
    private readonly splitRepository: Repository<Split>,
  ) {}

  async create(createParticipantDto: CreateParticipantDto): Promise<Participant> {
    // Verify that the split exists
    const split = await this.splitRepository.findOne({
      where: { id: createParticipantDto.splitId },
    });

    if (!split) {
      throw new NotFoundException(`Split with ID ${createParticipantDto.splitId} not found`);
    }

    // Calculate payment status based on amounts
    const paymentStatus = this.calculatePaymentStatus(
      createParticipantDto.amountOwed,
      createParticipantDto.amountPaid || 0,
    );

    const participant = this.participantRepository.create({
      ...createParticipantDto,
      paymentStatus,
    });

    return await this.participantRepository.save(participant);
  }

  async findAll(): Promise<Participant[]> {
    return await this.participantRepository.find({
      relations: ['split'],
    });
  }

  async findOne(id: string): Promise<Participant> {
    const participant = await this.participantRepository.findOne({
      where: { id },
      relations: ['split'],
    });

    if (!participant) {
      throw new NotFoundException(`Participant with ID ${id} not found`);
    }

    return participant;
  }

  async update(id: string, updateParticipantDto: UpdateParticipantDto): Promise<Participant> {
    const participant = await this.findOne(id);

    // If splitId is being updated, verify the new split exists
    if (updateParticipantDto.splitId && updateParticipantDto.splitId !== participant.splitId) {
      const split = await this.splitRepository.findOne({
        where: { id: updateParticipantDto.splitId },
      });

      if (!split) {
        throw new NotFoundException(`Split with ID ${updateParticipantDto.splitId} not found`);
      }
    }

    // Update payment status if amounts changed
    let paymentStatus = participant.paymentStatus;
    if (updateParticipantDto.amountOwed !== undefined || updateParticipantDto.amountPaid !== undefined) {
      const amountOwed = updateParticipantDto.amountOwed ?? participant.amountOwed;
      const amountPaid = updateParticipantDto.amountPaid ?? participant.amountPaid;
      paymentStatus = this.calculatePaymentStatus(amountOwed, amountPaid);
    }

    Object.assign(participant, updateParticipantDto, { paymentStatus });
    return await this.participantRepository.save(participant);
  }

  async remove(id: string): Promise<void> {
    const participant = await this.findOne(id);
    await this.participantRepository.remove(participant);
  }

  /**
   * Calculate payment status based on amount owed and amount paid
   */
  private calculatePaymentStatus(amountOwed: number, amountPaid: number): PaymentStatus {
    if (amountPaid === 0) {
      return PaymentStatus.PENDING;
    } else if (amountPaid >= amountOwed) {
      return PaymentStatus.PAID;
    } else {
      return PaymentStatus.PARTIAL;
    }
  }
}
