#include <stdio.h>

int main() {
    double A;
    double B;
    double C;

    A = 0.0;
    B = 0.0;
    C = 0.0;

    printf("Lado A: ");
    scanf("%lf", &A);
    printf("Lado B: ");
    scanf("%lf", &B);
    printf("Lado C: ");
    scanf("%lf", &C);

    if (A > 0.0 && B > 0.0 && C > 0.0 && A + B > C && A + C > B && B + C > A) {
        if (A == B && B == C) {
            printf("Triangulo equilatero.\n");
        } else if (A == B || A == C || B == C) {
            printf("Triangulo isosceles.\n");
        } else {
            printf("Triangulo escaleno.\n");
        }
    } else {
        printf("Las medidas no forman un triangulo.\n");
    }
}
