#include <stdio.h>
#include <math.h>
#include <stdlib.h>
int main() {
    volatile double Z = 0.0, I = INFINITY, M = -1.0, D2 = 2.0, P = 1.0;
    printf("0/0      %f\n", Z / Z);
    printf("inf-inf  %f\n", I - I);
    printf("inf*0    %f\n", I * Z);
    printf("sqrt(-1) %f\n", sqrt(M));
    printf("log(-1)  %f\n", log(M));
    printf("log10(-1)%f\n", log10(M));
    printf("acos(2)  %f\n", acos(D2));
    printf("asin(2)  %f\n", asin(D2));
    printf("pow(-1,.5)%f\n", pow(M, 0.5));
    printf("fmod(1,0)%f\n", fmod(P, Z));
    printf("sin(inf) %f\n", sin(I));
    printf("NAN      %f\n", NAN);
    printf("-NAN     %f\n", -NAN);
    printf("atof     %f\n", atof("nan"));
    printf("nan+1    %f\n", NAN + P);
    printf("(-nan)+1 %f\n", (Z / Z) + P);
    printf("fabs(0/0)%f\n", fabs(Z / Z));
    printf("-(0/0)   %f\n", -(Z / Z));
    printf("(float)  %f\n", (double)(float)(Z / Z));
    printf("%%g %g %e\n", Z / Z, NAN);
}
