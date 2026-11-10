#include <stdio.h>
int main(void) {
    int A, B, C;
    scanf("%d%d%d", &A, &B, &C);
    if (A <= 0 || B <= 0 || C <= 0 || A + B <= C || A + C <= B || B + C <= A)
        printf("No forma triangulo\n");
    else if (A == B && B == C) printf("Equilatero\n");
    else if (A == B || A == C || B == C) printf("Isosceles\n");
    else printf("Escaleno\n");
    return 0;
}
