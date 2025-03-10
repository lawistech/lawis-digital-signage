// src/app/features/profile/upgrade-plan.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface PricingPlan {
  name: string;
  description: string;
  price: number;
  yearlyPrice?: number;
  interval: 'month' | 'year';
  features: string[];
  recommended?: boolean;
  limits: {
    screens: number;
    storage: number; // in MB
  };
}

@Component({
  selector: 'app-upgrade-plan',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './upgrade-plan.component.html'
})
export class UpgradePlanComponent {
  billingInterval: 'month' | 'year' = 'month';
  currentPlan = 'Free Plan'; // This would be retrieved from user data
  
  plans: PricingPlan[] = [
    {
      name: 'Free Plan',
      description: 'Basic features for small deployments',
      price: 0,
      interval: 'month',
      features: [
        'Up to 5 screens',
        '500 MB storage',
        'Basic content scheduling',
        'Standard support'
      ],
      limits: {
        screens: 5,
        storage: 500 // MB
      }
    },
    {
      name: 'Pro Plan',
      description: 'Advanced features for growing businesses',
      price: 29,
      yearlyPrice: 24.65, // ~15% discount
      interval: 'month',
      features: [
        'Up to 20 screens',
        '5 GB storage',
        'Advanced scheduling',
        'Content templates',
        'Priority support'
      ],
      recommended: true,
      limits: {
        screens: 20,
        storage: 5000 // MB (5 GB)
      }
    },
    {
      name: 'Enterprise Plan',
      description: 'Full features for large-scale deployments',
      price: 99,
      yearlyPrice: 84.15, // ~15% discount
      interval: 'month',
      features: [
        'Unlimited screens',
        '50 GB storage',
        'Custom branding',
        'API access',
        'Advanced analytics',
        'Dedicated support',
        'SSO Integration'
      ],
      limits: {
        screens: 500, // Will display as unlimited in UI
        storage: 50000 // MB (50 GB)
      }
    }
  ];
  
  getPlanPrice(plan: PricingPlan): number {
    if (this.billingInterval === 'year' && plan.yearlyPrice) {
      return plan.yearlyPrice;
    }
    return plan.price;
  }
  
  getPercentage(value: number, max: number): number {
    const percentage = (value / max) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  }
  
  formatStorage(megabytes: number): string {
    if (megabytes < 1000) {
      return `${megabytes} MB`;
    }
    return `${(megabytes / 1000).toFixed(0)} GB`;
  }
  
  selectPlan(plan: PricingPlan): void {
    // In a real app, this would redirect to a payment page or modal
    console.log(`Selected plan: ${plan.name}`);
    
    if (plan.name === 'Free Plan') {
      alert('You have downgraded to the Free Plan');
      this.currentPlan = 'Free Plan';
    } else if (plan.price === 0) {
      this.currentPlan = plan.name;
    } else {
      // Show payment modal/redirect to payment page
      alert(`Please complete payment for ${plan.name}: $${this.getPlanPrice(plan)}/${this.billingInterval}`);
    }
  }
}