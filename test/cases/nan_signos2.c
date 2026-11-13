#include <stdio.h>
#include <math.h>
int main() {
    volatile double M = -1.0, D2 = 2.0, H = 0.5, I = INFINITY, Z = 0.0;
    printf("log2(-1) %f\n", log2(M));
    printf("log1p(-2) %f\n", log1p(-2.0 + Z));
    printf("acosh(.5) %f\n", acosh(H));
    printf("atanh(2) %f\n", atanh(D2));
    printf("sqrtf(-1) %f\n", sqrtf(M));
    printf("pow(0,-1)... %f\n", pow(Z, M));
    printf("cos(inf) %f\n", cos(I));
    printf("tan(inf) %f\n", tan(I));
    printf("exp(nan) %f\n", exp(NAN));
    printf("cbrt(-8) %f\n", cbrt(-8.0 + Z));
    printf("hypot(nan,1) %f\n", hypot(NAN, 1.0 + Z));
    printf("fmax(nan,1) %f\n", fmax(NAN, 1.0 + Z));
    printf("atan2(nan,1) %f\n", atan2(NAN, 1.0 + Z));
    printf("floor(nan) %f\n", floor(NAN));
}
