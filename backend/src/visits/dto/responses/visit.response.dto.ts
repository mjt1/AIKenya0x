import { ApiProperty } from '@nestjs/swagger';

export class ObservationDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({
    enum: ['observation', 'issue', 'advice'],
    description: 'Auto-structured by the AI service from the free-text notes.',
  })
  kind!: string;
  @ApiProperty() text!: string;
  @ApiProperty({ required: false, format: 'date-time' }) capturedAt?: string;
}

export class VisitEnterpriseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['Dairy', 'Sugarcane'] }) type!: string;
}

export class VisitFarmerStubDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class VisitResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date-time' }) date!: string;
  @ApiProperty({ format: 'uuid' }) agentId!: string;
  @ApiProperty({ required: false, nullable: true, type: String }) notes?: string;
  @ApiProperty({ required: false, format: 'date-time' }) createdAt?: string;
  @ApiProperty({ required: false, format: 'date-time' }) updatedAt?: string;
  @ApiProperty({ type: VisitFarmerStubDto, required: false })
  farmer?: VisitFarmerStubDto;
  @ApiProperty({ type: [ObservationDto] }) observations!: ObservationDto[];
  @ApiProperty({ type: [VisitEnterpriseDto] })
  enterprises!: VisitEnterpriseDto[];
}
