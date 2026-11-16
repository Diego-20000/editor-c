#include <stdio.h>
#include <math.h>
int main() { double A, B, C, S; scanf("%lf %lf %lf", &A, &B, &C); if (A + B <= C || A + C <= B || B + C <= A) printf("NO ES TRIANGULO\n"); else { S = (A + B + C) / 2; printf("%.4f %s\n", sqrt(S * (S - A) * (S - B) * (S - C)), A == B && B == C ? "EQUILATERO" : A == B || B == C || A == C ? "ISOSCELES" : "ESCALENO"); } return 0; }
