import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // TODO: Implement real token validation (Firebase/Clerk/etc.)
    // For now, check for Bearer token presence or development header
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Mock user extraction from token
      // In production: const decoded = verify(token); request.user = decoded;
      const token = authHeader.split(' ')[1];
      request.user = { id: 'mock-user-id', walletAddress: 'mock-wallet-address' };
      return true;
    }

    // Allow development bypass via x-user-id header
    const devUserId = request.headers['x-user-id'];
    if (devUserId) {
      request.user = { id: devUserId, walletAddress: devUserId };
      return true;
    }

    throw new UnauthorizedException('Missing or invalid authorization token');
  }
}
