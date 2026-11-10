#include <stdio.h>
#include <math.h>
int main(void) {
    float R;
    double A;
    scanf("%f", &R);
    if (R < 0.0f || R > 1000.0f) return 0;
    A = acos(-1.0) * R * R;
    printf("Area: %.2f\n", A);
    return 0;
}
