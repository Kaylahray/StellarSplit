import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Split } from '../../entities/split.entity';

@Entity('expense_categories')
export class ExpenseCategory {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    userId!: string; // Owner wallet address

    @Column({ type: 'varchar' })
    name!: string;

    @Column({ type: 'varchar', length: 7 })
    color!: string; // Hex code

    @Column({ type: 'boolean', default: false })
    taxDeductible!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @OneToMany(() => Split, (split) => split.category)
    splits?: Split[];
}
